// API: Editor Authentication
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: 'Missing accessCode' });
        }

        const editors = await storage.getEditors();
        const editor = editors.find(e => e.accessCode === accessCode && e.active);

        if (editor) {
            // Return editor info without sensitive data
            return res.status(200).json({
                success: true,
                editor: {
                    id: editor.id,
                    name: editor.name,
                    email: editor.email,
                    role: editor.role,
                    teamId: editor.teamId
                }
            });
        }

        return res.status(401).json({ success: false, error: 'Invalid access code' });
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
