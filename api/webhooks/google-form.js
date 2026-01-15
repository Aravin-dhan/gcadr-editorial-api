// API: Google Forms Webhook
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');
const EmailService = require('../../lib/email-service');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const email = new EmailService();

        let formData = req.body;
        if (formData.formData) formData = formData.formData;

        const submission = {
            title: formData['Article Title'] || formData.title || formData['Title'],
            authorName: formData['Author Name'] || formData.authorName || formData['Full Name'],
            authorEmail: formData['Email Address'] || formData.authorEmail || formData['Email'],
            authorAffiliation: formData['Affiliation'] || formData['Institution/University'] || '',
            abstract: formData['Abstract'] || formData.abstract || '',
            category: formData['Category'] || formData.category || 'General',
            keywords: formData['Keywords'] || formData.keywords || '',
            documentUrl: formData['Document URL'] || formData['Google Drive Link'] || '',
            status: 'submitted', teamId: null, assignedCE: null, assignedAE: null, assignedSE: null,
            plagiarismReport: null, aiCheckReport: null, feedback: [], versions: [],
            source: 'google_form', formResponseId: formData.responseId || null
        };

        if (!submission.title || !submission.authorName || !submission.authorEmail) {
            return res.status(400).json({ error: 'Missing required fields from form' });
        }

        if (submission.documentUrl) {
            submission.versions.push({ version: 1, documentUrl: submission.documentUrl, uploadedAt: new Date().toISOString() });
        }
        if (typeof submission.keywords === 'string') {
            submission.keywords = submission.keywords.split(',').map(k => k.trim()).filter(k => k);
        }

        const saved = await storage.addSubmission(submission);

        await storage.appendAuditLog({
            id: `log-${Date.now()}`, action: 'SUBMISSION_CREATED',
            details: { submissionId: saved.id, title: saved.title, source: 'google_form' },
            performedBy: 'google_forms_webhook', timestamp: new Date().toISOString(),
            description: `New submission from Google Form: "${saved.title}"`
        });

        await email.sendSubmissionReceived(saved.authorEmail, saved.authorName, saved.title, saved.id);

        // Auto-assign
        const editors = await storage.getEditors();
        const copyEditors = editors.filter(e => e.role === 'copy_editor' && e.active);

        if (copyEditors.length > 0) {
            const randomCE = copyEditors[Math.floor(Math.random() * copyEditors.length)];
            const teamAEs = editors.filter(e => e.role === 'associate_editor' && e.teamId === randomCE.teamId && e.active);
            const teamSEs = editors.filter(e => e.role === 'senior_editor' && e.teamId === randomCE.teamId && e.active);

            await storage.updateSubmission(saved.id, {
                assignedCE: randomCE.id,
                assignedAE: teamAEs.length > 0 ? teamAEs[0].id : null,
                assignedSE: teamSEs.length > 0 ? teamSEs[0].id : null,
                teamId: randomCE.teamId, status: 'ce_review'
            }, `Auto-assigned to ${randomCE.name}`);

            await email.sendEditorNotification(randomCE.email, randomCE.name, saved.title, 'assigned');
        }

        return res.status(201).json({ success: true, submissionId: saved.id });
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
