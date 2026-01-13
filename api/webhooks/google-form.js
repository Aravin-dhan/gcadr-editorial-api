// API: Google Forms Webhook
// Receives submissions from Google Forms and creates new articles
const GitHubStorage = require('../../lib/github-storage');
const EmailService = require('../../lib/email-service');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const email = new EmailService();

        // Google Forms sends data in various formats depending on setup
        // This handles both direct webhook and Apps Script forwarding
        let formData = req.body;

        // If using Google Apps Script, data might be nested
        if (formData.formData) {
            formData = formData.formData;
        }

        // Map Google Form fields to our submission format
        // Field names should match your Google Form questions
        const submission = {
            title: formData['Article Title'] || formData.title || formData['Title'],
            authorName: formData['Author Name'] || formData.authorName || formData['Full Name'],
            authorEmail: formData['Email Address'] || formData.authorEmail || formData['Email'],
            authorAffiliation: formData['Affiliation'] || formData.authorAffiliation || formData['Institution/University'] || '',
            abstract: formData['Abstract'] || formData.abstract || '',
            category: formData['Category'] || formData.category || 'General',
            keywords: formData['Keywords'] || formData.keywords || '',
            documentUrl: formData['Document URL'] || formData.documentUrl || formData['Google Drive Link'] || '',
            status: 'submitted',
            teamId: null,
            assignedCE: null,
            assignedAE: null,
            assignedSE: null,
            plagiarismReport: null,
            aiCheckReport: null,
            feedback: [],
            versions: [],
            source: 'google_form',
            formResponseId: formData.responseId || null,
            formTimestamp: formData.timestamp || new Date().toISOString()
        };

        // Validate required fields
        if (!submission.title || !submission.authorName || !submission.authorEmail) {
            console.log('Received form data:', JSON.stringify(formData, null, 2));
            return res.status(400).json({
                error: 'Missing required fields from form',
                received: Object.keys(formData),
                hint: 'Ensure form has: Article Title, Author Name, Email Address'
            });
        }

        // Add initial version
        if (submission.documentUrl) {
            submission.versions.push({
                version: 1,
                documentUrl: submission.documentUrl,
                uploadedAt: new Date().toISOString(),
                source: 'google_form'
            });
        }

        // Parse keywords if string
        if (typeof submission.keywords === 'string') {
            submission.keywords = submission.keywords.split(',').map(k => k.trim()).filter(k => k);
        }

        // Save to GitHub
        const saved = await storage.addSubmission(submission);

        // Log
        await storage.appendAuditLog({
            id: `log-${Date.now()}`,
            action: 'SUBMISSION_CREATED',
            details: {
                submissionId: saved.id,
                title: saved.title,
                source: 'google_form'
            },
            performedBy: 'google_forms_webhook',
            timestamp: new Date().toISOString(),
            description: `New submission from Google Form: "${saved.title}"`
        });

        // Send confirmation to author
        await email.sendSubmissionReceived(
            saved.authorEmail,
            saved.authorName,
            saved.title,
            saved.id
        );

        // Auto-assign to Copy Editor
        const editors = await storage.getEditors();
        const copyEditors = editors.filter(e => e.role === 'copy_editor' && e.active);

        if (copyEditors.length > 0) {
            const randomCE = copyEditors[Math.floor(Math.random() * copyEditors.length)];

            const updates = {
                assignedCE: randomCE.id,
                teamId: randomCE.teamId,
                status: 'ce_review'
            };

            // Assign AE and SE from same team
            const teamAEs = editors.filter(e => e.role === 'associate_editor' && e.teamId === randomCE.teamId && e.active);
            const teamSEs = editors.filter(e => e.role === 'senior_editor' && e.teamId === randomCE.teamId && e.active);

            if (teamAEs.length > 0) updates.assignedAE = teamAEs[0].id;
            if (teamSEs.length > 0) updates.assignedSE = teamSEs[0].id;

            await storage.updateSubmission(saved.id, updates, `Auto-assigned to ${randomCE.name}`);

            // Notify Copy Editor
            await email.sendEditorNotification(
                randomCE.email,
                randomCE.name,
                saved.title,
                'assigned'
            );

            await storage.appendAuditLog({
                id: `log-${Date.now()}`,
                action: 'SUBMISSION_ASSIGNED',
                details: {
                    submissionId: saved.id,
                    assignedCE: randomCE.name,
                    teamId: randomCE.teamId
                },
                performedBy: 'system',
                timestamp: new Date().toISOString(),
                description: `Auto-assigned to ${randomCE.name}`
            });
        }

        return res.status(201).json({
            success: true,
            submissionId: saved.id,
            message: 'Submission received and processed'
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};
