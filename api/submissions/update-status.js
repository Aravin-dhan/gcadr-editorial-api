// API: Update submission status (for editorial workflow)
const GitHubStorage = require('../../lib/github-storage');
const EmailService = require('../../lib/email-service');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const email = new EmailService();

        const {
            submissionId,
            editorId,
            newStatus,
            feedback,
            plagiarismReport,
            aiCheckReport
        } = req.body;

        if (!submissionId || !editorId || !newStatus) {
            return res.status(400).json({
                error: 'Missing required fields: submissionId, editorId, newStatus'
            });
        }

        // Get current submission
        const submission = await storage.getSubmission(submissionId);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Get editors for notifications
        const editors = await storage.getEditors();
        const editor = editors.find(e => e.id === editorId);

        if (!editor) {
            return res.status(403).json({ error: 'Editor not found' });
        }

        // Validate permission
        const canUpdate = (
            editor.role === 'admin' ||
            (editor.role === 'copy_editor' && submission.assignedCE === editorId) ||
            (editor.role === 'associate_editor' && submission.assignedAE === editorId) ||
            (editor.role === 'senior_editor' && submission.assignedSE === editorId)
        );

        if (!canUpdate) {
            return res.status(403).json({ error: 'Not authorized to update this submission' });
        }

        const oldStatus = submission.status;

        // Build updates
        const updates = {
            status: newStatus
        };

        if (feedback) {
            updates.feedback = [
                ...(submission.feedback || []),
                {
                    editorId,
                    editorName: editor.name,
                    status: newStatus,
                    feedback,
                    timestamp: new Date().toISOString()
                }
            ];
        }

        if (plagiarismReport) {
            updates.plagiarismReport = {
                url: plagiarismReport,
                uploadedAt: new Date().toISOString(),
                uploadedBy: editorId
            };
        }

        if (aiCheckReport) {
            updates.aiCheckReport = {
                url: aiCheckReport,
                uploadedAt: new Date().toISOString(),
                uploadedBy: editorId
            };
        }

        if (newStatus === 'published') {
            updates.publishedAt = new Date().toISOString();
        }

        // Save update
        const updated = await storage.updateSubmission(
            submissionId,
            updates,
            `Status: ${oldStatus} → ${newStatus} by ${editor.name}`
        );

        // Log action
        await storage.appendAuditLog({
            id: `log-${Date.now()}`,
            action: 'STATUS_CHANGED',
            details: { submissionId, oldStatus, newStatus, editorId, editorName: editor.name },
            performedBy: editorId,
            timestamp: new Date().toISOString(),
            description: `Status: ${oldStatus} → ${newStatus}`
        });

        // Send notifications
        // Notify author of status change
        await email.sendStatusUpdate(
            submission.authorEmail,
            submission.authorName,
            submission.title,
            newStatus,
            feedback
        );

        // Notify next editor in chain
        if (newStatus === 'ae_review' && submission.assignedAE) {
            const ae = editors.find(e => e.id === submission.assignedAE);
            if (ae) {
                await email.sendEditorNotification(ae.email, ae.name, submission.title, 'ready_for_review');
            }
        } else if (newStatus === 'se_review' && submission.assignedSE) {
            const se = editors.find(e => e.id === submission.assignedSE);
            if (se) {
                await email.sendEditorNotification(se.email, se.name, submission.title, 'ready_for_review');
            }
        }

        return res.status(200).json({
            success: true,
            data: updated,
            message: `Status updated to ${newStatus}`
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
