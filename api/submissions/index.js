// API: Get all submissions
const GitHubStorage = require('../lib/github-storage');

module.exports = async (req, res) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const storage = new GitHubStorage();

        if (req.method === 'GET') {
            const submissions = await storage.getSubmissions();

            // Optional filtering
            const { status, team, editor } = req.query;
            let filtered = submissions;

            if (status && status !== 'all') {
                filtered = filtered.filter(s => s.status === status);
            }
            if (team) {
                filtered = filtered.filter(s => s.teamId === team);
            }
            if (editor) {
                filtered = filtered.filter(s =>
                    s.assignedCE === editor ||
                    s.assignedAE === editor ||
                    s.assignedSE === editor
                );
            }

            return res.status(200).json({
                success: true,
                data: filtered,
                total: filtered.length
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
