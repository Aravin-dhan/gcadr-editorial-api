// API: Create new submission (from Google Form webhook or direct)
const GitHubStorage = require('../../lib/github-storage');
const EmailService = require('../../lib/email-service');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const email = new EmailService();

        const {
            title,
            authorName,
            authorEmail,
            authorAffiliation,
            abstract,
            category,
            keywords,
            documentUrl
        } = req.body;

        // Validate required fields
        if (!title || !authorName || !authorEmail || !abstract || !documentUrl) {
            return res.status(400).json({
                error: 'Missing required fields: title, authorName, authorEmail, abstract, documentUrl'
            });
        }

        // Create submission
        const submission = {
            title,
            authorName,
            authorEmail,
            authorAffiliation: authorAffiliation || '',
            abstract,
            category: category || 'General',
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
            documentUrl,
            status: 'submitted',
            teamId: null,
            assignedCE: null,
            assignedAE: null,
            assignedSE: null,
            plagiarismReport: null,
            aiCheckReport: null,
            feedback: [],
            versions: [{
                version: 1,
                documentUrl,
                uploadedAt: new Date().toISOString()
            }]
        };

        const saved = await storage.addSubmission(submission);

        // Log the action
        await storage.appendAuditLog({
            id: `log-${Date.now()}`,
            action: 'SUBMISSION_CREATED',
            details: { submissionId: saved.id, title },
            performedBy: 'system',
            timestamp: new Date().toISOString(),
            description: `New submission: "${title}"`
        });

        // Send confirmation email to author
        await email.sendSubmissionReceived(authorEmail, authorName, title, saved.id);

        // Auto-assign to Copy Editor
        const editors = await storage.getEditors();
        const copyEditors = editors.filter(e => e.role === 'copy_editor' && e.active);

        if (copyEditors.length > 0) {
            const randomCE = copyEditors[Math.floor(Math.random() * copyEditors.length)];
            saved.assignedCE = randomCE.id;
            saved.teamId = randomCE.teamId;
            saved.status = 'ce_review';

            // Assign AE and SE from same team
            const teamAEs = editors.filter(e => e.role === 'associate_editor' && e.teamId === randomCE.teamId && e.active);
            const teamSEs = editors.filter(e => e.role === 'senior_editor' && e.teamId === randomCE.teamId && e.active);

            if (teamAEs.length > 0) saved.assignedAE = teamAEs[0].id;
            if (teamSEs.length > 0) saved.assignedSE = teamSEs[0].id;

            await storage.updateSubmission(saved.id, {
                assignedCE: saved.assignedCE,
                assignedAE: saved.assignedAE,
                assignedSE: saved.assignedSE,
                teamId: saved.teamId,
                status: saved.status
            }, `Assigned to ${randomCE.name}`);

            // Notify CE
            await email.sendEditorNotification(randomCE.email, randomCE.name, title, 'assigned');

            await storage.appendAuditLog({
                id: `log-${Date.now()}`,
                action: 'SUBMISSION_ASSIGNED',
                details: { submissionId: saved.id, assignedCE: randomCE.name, teamId: saved.teamId },
                performedBy: 'system',
                timestamp: new Date().toISOString(),
                description: `Assigned to ${randomCE.name}`
            });
        }

        return res.status(201).json({
            success: true,
            data: saved,
            message: 'Submission created successfully'
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
