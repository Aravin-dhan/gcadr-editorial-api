// GitHub Data Storage Helper
// Stores editorial data as JSON files in a GitHub repository

const { Octokit } = require('@octokit/rest');

class GitHubStorage {
    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        this.owner = process.env.GITHUB_REPO_OWNER;
        this.repo = process.env.GITHUB_REPO_NAME;
        this.branch = 'master';
    }

    // Get file content from repo
    async getFile(path) {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: path,
                ref: this.branch
            });

            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            return {
                content: JSON.parse(content),
                sha: response.data.sha
            };
        } catch (error) {
            if (error.status === 404) {
                return { content: null, sha: null };
            }
            throw error;
        }
    }

    // Create or update file in repo
    async saveFile(path, data, message) {
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

        // Get current SHA if file exists
        let sha = null;
        try {
            const existing = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: path,
                ref: this.branch
            });
            sha = existing.data.sha;
        } catch (error) {
            if (error.status !== 404) throw error;
        }

        const params = {
            owner: this.owner,
            repo: this.repo,
            path: path,
            message: message || `Update ${path}`,
            content: content,
            branch: this.branch
        };

        if (sha) params.sha = sha;

        const response = await this.octokit.repos.createOrUpdateFileContents(params);
        return response.data;
    }

    // Data-specific methods
    async getEditors() {
        const result = await this.getFile('data/editors.json');
        return result.content || [];
    }

    async saveEditors(editors, message) {
        return this.saveFile('data/editors.json', editors, message || 'Update editors');
    }

    async getTeams() {
        const result = await this.getFile('data/teams.json');
        return result.content || [];
    }

    async saveTeams(teams, message) {
        return this.saveFile('data/teams.json', teams, message || 'Update teams');
    }

    async getSubmissions() {
        const result = await this.getFile('data/submissions.json');
        return result.content || [];
    }

    async saveSubmissions(submissions, message) {
        return this.saveFile('data/submissions.json', submissions, message || 'Update submissions');
    }

    async getAuditLog() {
        const result = await this.getFile('data/audit-log.json');
        return result.content || [];
    }

    async appendAuditLog(entry) {
        const logs = await this.getAuditLog();
        logs.unshift(entry);
        // Keep last 1000 entries
        if (logs.length > 1000) logs.length = 1000;
        return this.saveFile('data/audit-log.json', logs, `Audit: ${entry.action}`);
    }

    // Get submission by ID
    async getSubmission(id) {
        const submissions = await this.getSubmissions();
        return submissions.find(s => s.id === id);
    }

    // Update single submission
    async updateSubmission(id, updates, message) {
        const submissions = await this.getSubmissions();
        const index = submissions.findIndex(s => s.id === id);

        if (index === -1) return null;

        submissions[index] = { ...submissions[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveSubmissions(submissions, message);

        return submissions[index];
    }

    // Add new submission
    async addSubmission(submission) {
        const submissions = await this.getSubmissions();
        submission.id = `sub-${Date.now()}`;
        submission.createdAt = new Date().toISOString();
        submission.updatedAt = submission.createdAt;
        submissions.push(submission);
        await this.saveSubmissions(submissions, `New submission: ${submission.title}`);
        return submission;
    }
}

module.exports = GitHubStorage;
