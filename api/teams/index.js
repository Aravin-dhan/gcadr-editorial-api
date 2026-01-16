// API: Team management
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');

const handler = async (req, res) => {
    const storage = new GitHubStorage();

    try {
        if (req.method === 'GET') {
            const teams = await storage.getTeams();
            const editors = await storage.getEditors();
            const submissions = await storage.getSubmissions();

            const enriched = teams.map(team => {
                const teamEditors = editors.filter(e => e.teamId === team.id && e.active);
                const teamSubs = submissions.filter(s => s.teamId === team.id);
                const active = teamSubs.filter(s => !['published', 'rejected'].includes(s.status));

                return {
                    ...team,
                    seniorEditors: teamEditors.filter(e => e.role === 'senior_editor').length,
                    associateEditors: teamEditors.filter(e => e.role === 'associate_editor').length,
                    copyEditors: teamEditors.filter(e => e.role === 'copy_editor').length,
                    totalMembers: teamEditors.length,
                    activeSubmissions: active.length
                };
            });

            return res.status(200).json({ success: true, data: enriched });
        }

        if (req.method === 'POST') {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Missing name' });

            const team = { id: `team-${Date.now()}`, name, active: true, createdAt: new Date().toISOString() };
            const teams = await storage.getTeams();
            teams.push(team);
            await storage.saveTeams(teams, `Added team: ${name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`, action: 'TEAM_ADDED',
                details: { teamId: team.id, name },
                performedBy: 'admin', timestamp: new Date().toISOString(),
                description: `New team "${name}" created`
            });

            return res.status(201).json({ success: true, data: team });
        }

        if (req.method === 'PUT') {
            const { teamId, name, active } = req.body;
            if (!teamId) return res.status(400).json({ error: 'Missing teamId' });

            const teams = await storage.getTeams();
            const index = teams.findIndex(t => t.id === teamId);
            if (index === -1) return res.status(404).json({ error: 'Team not found' });

            if (name !== undefined) teams[index].name = name;
            if (active !== undefined) teams[index].active = active;
            await storage.saveTeams(teams, `Updated team: ${teams[index].name}`);

            return res.status(200).json({ success: true, data: teams[index] });
        }

        if (req.method === 'DELETE') {
            const { teamId } = req.query;
            if (!teamId) return res.status(400).json({ error: 'Missing teamId' });

            const teams = await storage.getTeams();
            const index = teams.findIndex(t => t.id === teamId);
            if (index === -1) return res.status(404).json({ error: 'Team not found' });

            const teamName = teams[index].name;
            teams[index].active = false;
            await storage.saveTeams(teams, `Deactivated team: ${teamName}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`, action: 'TEAM_DEACTIVATED',
                details: { teamId, name: teamName },
                performedBy: 'admin', timestamp: new Date().toISOString(),
                description: `Team "${teamName}" deactivated`
            });

            return res.status(200).json({ success: true, message: `Team "${teamName}" deactivated` });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
