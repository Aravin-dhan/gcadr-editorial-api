// API: Audit log
const GitHubStorage = require('../../lib/github-storage');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const logs = await storage.getAuditLog();

        // Optional filtering
        const { action, submissionId, editorId, limit } = req.query;
        let filtered = logs;

        if (action) {
            filtered = filtered.filter(l => l.action === action);
        }
        if (submissionId) {
            filtered = filtered.filter(l => l.details?.submissionId === submissionId);
        }
        if (editorId) {
            filtered = filtered.filter(l =>
                l.performedBy === editorId ||
                l.details?.editorId === editorId
            );
        }
        if (limit) {
            filtered = filtered.slice(0, parseInt(limit));
        }

        return res.status(200).json({
            success: true,
            data: filtered,
            total: filtered.length
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
