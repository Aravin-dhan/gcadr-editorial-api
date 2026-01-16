// API: RSS Feed for published posts
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const submissions = await storage.getSubmissions();

        // Get published posts only
        const published = submissions
            .filter(s => s.status === 'published')
            .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
            .slice(0, 20); // Last 20 posts

        // Generate RSS XML
        const baseUrl = 'https://blog.gcadr.in';
        const items = published.map(post => {
            const pubDate = new Date(post.publishedAt || post.createdAt).toUTCString();
            const link = `${baseUrl}/article.html?id=${post.id}`;

            return `
    <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${link}</link>
        <guid>${link}</guid>
        <pubDate>${pubDate}</pubDate>
        <author><![CDATA[${post.authorName}${post.authorAffiliation ? ' - ' + post.authorAffiliation : ''}]]></author>
        <category>${post.category || 'General'}</category>
        <description><![CDATA[${post.abstract || ''}]]></description>
    </item>`;
        }).join('\n');

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>GCADR Blog | GNLU Centre for Alternative Dispute Resolution</title>
        <link>${baseUrl}</link>
        <description>Academic blog covering Alternative Dispute Resolution, Arbitration, Mediation, and Conciliation</description>
        <language>en</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
        ${items}
    </channel>
</rss>`;

        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        return res.status(200).send(rss);
    } catch (error) {
        console.error('RSS Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = allowCors(handler);
