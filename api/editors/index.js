// API: Editor management
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');

const handler = async (req, res) => {
    const storage = new GitHubStorage();

    try {
        if (req.method === 'GET') {
            const editors = await storage.getEditors();
            const safe = editors.map(({ accessCode, accessCodeHash, ...rest }) => rest);
            return res.status(200).json({ success: true, data: safe });
        }

        if (req.method === 'POST') {
            const { name, email, role, teamId } = req.body;

            if (!name || !email || !role || !teamId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let accessCode = 'gcadr-';
            for (let i = 0; i < 8; i++) accessCode += chars.charAt(Math.floor(Math.random() * chars.length));

            const editor = {
                id: `editor-${Date.now()}`, name, email, role, teamId, accessCode,
                active: true, createdAt: new Date().toISOString()
            };

            const editors = await storage.getEditors();
            editors.push(editor);
            await storage.saveEditors(editors, `Added editor: ${name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`, action: 'EDITOR_ADDED',
                details: { editorId: editor.id, name, role },
                performedBy: 'admin', timestamp: new Date().toISOString(),
                description: `New editor "${name}" added as ${role}`
            });

            return res.status(201).json({ success: true, data: editor, message: `Access code: ${accessCode}` });
        }

        if (req.method === 'DELETE') {
            const { editorId } = req.query;
            if (!editorId) return res.status(400).json({ error: 'Missing editorId' });

            const editors = await storage.getEditors();
            const index = editors.findIndex(e => e.id === editorId);
            if (index === -1) return res.status(404).json({ error: 'Editor not found' });

            editors[index].active = false;
            await storage.saveEditors(editors, `Removed editor: ${editors[index].name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`, action: 'EDITOR_REMOVED',
                details: { editorId, name: editors[index].name },
                performedBy: 'admin', timestamp: new Date().toISOString(),
                description: `Editor "${editors[index].name}" removed`
            });

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
