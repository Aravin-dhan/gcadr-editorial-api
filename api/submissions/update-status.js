// API: Update submission status
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');
const EmailService = require('../../lib/email-service');

const handler = async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const email = new EmailService();

        const { submissionId, editorId, newStatus, feedback, plagiarismReport, aiCheckReport } = req.body;

        if (!submissionId || !editorId || !newStatus) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const submission = await storage.getSubmission(submissionId);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        const editors = await storage.getEditors();
        const editor = editors.find(e => e.id === editorId) || { name: 'Admin', role: 'admin' };

        const oldStatus = submission.status;
        const updates = { status: newStatus };

        if (feedback) {
            updates.feedback = [...(submission.feedback || []), {
                editorId, editorName: editor.name, status: newStatus, feedback, timestamp: new Date().toISOString()
            }];
        }
        if (plagiarismReport) updates.plagiarismReport = { url: plagiarismReport, uploadedAt: new Date().toISOString() };
        if (aiCheckReport) updates.aiCheckReport = { url: aiCheckReport, uploadedAt: new Date().toISOString() };
        if (newStatus === 'published') updates.publishedAt = new Date().toISOString();

        const updated = await storage.updateSubmission(submissionId, updates, `Status: ${oldStatus} → ${newStatus}`);

        await storage.appendAuditLog({
            id: `log-${Date.now()}`, action: 'STATUS_CHANGED',
            details: { submissionId, oldStatus, newStatus, editorName: editor.name },
            performedBy: editorId, timestamp: new Date().toISOString(),
            description: `Status: ${oldStatus} → ${newStatus}`
        });

        await email.sendStatusUpdate(submission.authorEmail, submission.authorName, submission.title, newStatus, feedback);

        // Notify next editor
        if (newStatus === 'ae_review' && submission.assignedAE) {
            const ae = editors.find(e => e.id === submission.assignedAE);
            if (ae) await email.sendEditorNotification(ae.email, ae.name, submission.title, 'ready_for_review');
        } else if (newStatus === 'se_review' && submission.assignedSE) {
            const se = editors.find(e => e.id === submission.assignedSE);
            if (se) await email.sendEditorNotification(se.email, se.name, submission.title, 'ready_for_review');
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
