// API: Create new submission
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

        if (!title || !authorName || !authorEmail || !abstract || !documentUrl) {
            return res.status(400).json({
                error: 'Missing required fields: title, authorName, authorEmail, abstract, documentUrl'
            });
        }

        const submission = {
            title, authorName, authorEmail,
            authorAffiliation: authorAffiliation || '',
            abstract, category: category || 'General',
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
            documentUrl, status: 'submitted',
            teamId: null, assignedCE: null, assignedAE: null, assignedSE: null,
            plagiarismReport: null, aiCheckReport: null, feedback: [],
            versions: [{ version: 1, documentUrl, uploadedAt: new Date().toISOString() }]
        };

        const saved = await storage.addSubmission(submission);

        await storage.appendAuditLog({
            id: `log-${Date.now()}`, action: 'SUBMISSION_CREATED',
            details: { submissionId: saved.id, title },
            performedBy: 'system', timestamp: new Date().toISOString(),
            description: `New submission: "${title}"`
        });

        await email.sendSubmissionReceived(authorEmail, authorName, title, saved.id);

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
                teamId: randomCE.teamId,
                status: 'ce_review'
            }, `Assigned to ${randomCE.name}`);

            await email.sendEditorNotification(randomCE.email, randomCE.name, title, 'assigned');
        }

        return res.status(201).json({ success: true, data: saved, message: 'Submission created successfully' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
