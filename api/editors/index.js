// API: Editor management
const GitHubStorage = require('../../lib/github-storage');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storage = new GitHubStorage();

    try {
        // GET - List all editors
        if (req.method === 'GET') {
            const editors = await storage.getEditors();
            // Don't expose access codes
            const safe = editors.map(({ accessCode, accessCodeHash, ...rest }) => rest);
            return res.status(200).json({ success: true, data: safe });
        }

        // POST - Create new editor
        if (req.method === 'POST') {
            const { name, email, role, teamId } = req.body;

            if (!name || !email || !role || !teamId) {
                return res.status(400).json({
                    error: 'Missing required fields: name, email, role, teamId'
                });
            }

            const validRoles = ['copy_editor', 'associate_editor', 'senior_editor'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            // Generate access code
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let accessCode = 'gcadr-';
            for (let i = 0; i < 8; i++) {
                accessCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const editor = {
                id: `editor-${Date.now()}`,
                name,
                email,
                role,
                teamId,
                accessCode, // Will be hashed on first login
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const editors = await storage.getEditors();
            editors.push(editor);
            await storage.saveEditors(editors, `Added editor: ${name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`,
                action: 'EDITOR_ADDED',
                details: { editorId: editor.id, name, role, teamId },
                performedBy: 'admin',
                timestamp: new Date().toISOString(),
                description: `New editor "${name}" added as ${role}`
            });

            return res.status(201).json({
                success: true,
                data: { ...editor },
                message: `Editor created with access code: ${accessCode}`
            });
        }

        // DELETE - Remove editor
        if (req.method === 'DELETE') {
            const { editorId } = req.query;

            if (!editorId) {
                return res.status(400).json({ error: 'Missing editorId' });
            }

            const editors = await storage.getEditors();
            const index = editors.findIndex(e => e.id === editorId);

            if (index === -1) {
                return res.status(404).json({ error: 'Editor not found' });
            }

            const editor = editors[index];
            editors[index].active = false;
            editors[index].updatedAt = new Date().toISOString();

            await storage.saveEditors(editors, `Removed editor: ${editor.name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`,
                action: 'EDITOR_REMOVED',
                details: { editorId, name: editor.name },
                performedBy: 'admin',
                timestamp: new Date().toISOString(),
                description: `Editor "${editor.name}" removed`
            });

            return res.status(200).json({
                success: true,
                message: `Editor ${editor.name} removed`
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
