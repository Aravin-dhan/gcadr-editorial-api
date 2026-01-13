// API: Team management
const GitHubStorage = require('../../lib/github-storage');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storage = new GitHubStorage();

    try {
        // GET - List all teams
        if (req.method === 'GET') {
            const teams = await storage.getTeams();
            const editors = await storage.getEditors();
            const submissions = await storage.getSubmissions();

            // Enrich teams with member counts
            const enriched = teams.map(team => {
                const teamEditors = editors.filter(e => e.teamId === team.id && e.active);
                const teamSubmissions = submissions.filter(s => s.teamId === team.id);
                const activeSubmissions = teamSubmissions.filter(s =>
                    !['published', 'rejected'].includes(s.status)
                );

                return {
                    ...team,
                    seniorEditors: teamEditors.filter(e => e.role === 'senior_editor').length,
                    associateEditors: teamEditors.filter(e => e.role === 'associate_editor').length,
                    copyEditors: teamEditors.filter(e => e.role === 'copy_editor').length,
                    totalMembers: teamEditors.length,
                    activeSubmissions: activeSubmissions.length,
                    totalSubmissions: teamSubmissions.length
                };
            });

            return res.status(200).json({ success: true, data: enriched });
        }

        // POST - Create new team
        if (req.method === 'POST') {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Missing required field: name' });
            }

            const team = {
                id: `team-${Date.now()}`,
                name,
                active: true,
                createdAt: new Date().toISOString()
            };

            const teams = await storage.getTeams();
            teams.push(team);
            await storage.saveTeams(teams, `Added team: ${name}`);

            await storage.appendAuditLog({
                id: `log-${Date.now()}`,
                action: 'TEAM_ADDED',
                details: { teamId: team.id, name },
                performedBy: 'admin',
                timestamp: new Date().toISOString(),
                description: `New team "${name}" created`
            });

            return res.status(201).json({ success: true, data: team });
        }

        // PUT - Update team
        if (req.method === 'PUT') {
            const { teamId, name, active } = req.body;

            if (!teamId) {
                return res.status(400).json({ error: 'Missing teamId' });
            }

            const teams = await storage.getTeams();
            const index = teams.findIndex(t => t.id === teamId);

            if (index === -1) {
                return res.status(404).json({ error: 'Team not found' });
            }

            if (name !== undefined) teams[index].name = name;
            if (active !== undefined) teams[index].active = active;
            teams[index].updatedAt = new Date().toISOString();

            await storage.saveTeams(teams, `Updated team: ${teams[index].name}`);

            return res.status(200).json({ success: true, data: teams[index] });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
