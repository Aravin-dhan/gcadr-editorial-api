// API: Public blog posts (published submissions)
const allowCors = require('../../lib/cors');
const GitHubStorage = require('../../lib/github-storage');

// Sample posts for when no published submissions exist
const samplePosts = [
    {
        id: 'understanding-odr-india-2024',
        title: 'Understanding Online Dispute Resolution in India: A Critical Analysis',
        abstract: 'This article examines the evolution and implementation of Online Dispute Resolution mechanisms in the Indian legal framework, analyzing their efficacy in addressing access to justice concerns and the challenges posed by digital infrastructure disparities.',
        content: '<p>Online Dispute Resolution (ODR) represents a paradigmatic shift in how disputes are resolved in the digital age. The COVID-19 pandemic served as an unprecedented catalyst for the adoption of technology-mediated dispute resolution mechanisms across jurisdictions.</p><h2>Historical Context</h2><p>The conceptual foundations of ODR can be traced to the early experiments with automated negotiation systems in the 1990s. However, the systematic integration of ODR within formal legal frameworks is a relatively recent phenomenon in India.</p><h2>Legal Framework</h2><p>The Information Technology Act, 2000, as amended, provides the foundational legal infrastructure for electronic transactions and communications. However, the absence of dedicated ODR legislation has necessitated reliance on interpretive expansions of existing arbitration and mediation frameworks.</p><h2>Implementation Challenges</h2><p>Several structural impediments affect ODR adoption in India:</p><ul><li>Digital infrastructure disparities between urban and rural areas</li><li>Concerns regarding procedural fairness in technology-mediated proceedings</li><li>Questions of enforceability of ODR outcomes</li><li>Data privacy and security considerations</li></ul><h2>Comparative Perspectives</h2><p>Jurisdictions such as the European Union and China have developed more comprehensive ODR frameworks, offering valuable comparative insights for Indian policymakers.</p><h2>Conclusion</h2><p>While ODR holds significant promise for enhancing access to justice, its successful implementation requires careful attention to infrastructure development, regulatory clarity, and stakeholder capacity building.</p>',
        category: 'Arbitration',
        author: 'Prof. Vikas Gandhi',
        authorAffiliation: 'GNLU',
        date: '2024-01-08',
        status: 'published',
        keywords: ['ODR', 'Access to Justice', 'Digital Dispute Resolution', 'India']
    },
    {
        id: 'mediation-family-disputes-2024',
        title: 'Mediation in Family Disputes: Balancing Autonomy and Protection',
        abstract: 'An examination of the role of mediation in family law disputes, with particular attention to the tension between party autonomy and the protective functions of family law, drawing on empirical research and comparative jurisprudence.',
        content: '<p>Family mediation occupies a distinctive position within the broader ADR landscape, requiring mediators to navigate complex emotional dynamics while remaining attentive to structural power imbalances and the interests of non-participating parties, particularly children.</p><h2>Theoretical Foundations</h2><p>The application of mediation to family disputes raises fundamental questions about the appropriate scope of private ordering in matters traditionally subject to significant state regulation.</p><h2>Empirical Evidence</h2><p>Research conducted across multiple jurisdictions suggests that mediated family settlements demonstrate higher rates of voluntary compliance compared to adjudicated outcomes, though methodological limitations of existing studies warrant cautious interpretation.</p><h2>Protecting Vulnerable Parties</h2><p>The presence of domestic violence, significant power disparities, or mental health concerns requires careful screening protocols and, in some cases, may render mediation inappropriate as a dispute resolution mechanism.</p><h2>Recommendations</h2><p>Effective family mediation practice requires:</p><ul><li>Comprehensive screening for domestic violence and coercion</li><li>Specialized training for family mediators</li><li>Integration with legal advice mechanisms</li><li>Child-inclusive mediation protocols where appropriate</li></ul>',
        category: 'Mediation',
        author: 'Dr. Ananya Sharma',
        authorAffiliation: 'National Law School of India University',
        date: '2024-01-05',
        status: 'published',
        keywords: ['Family Mediation', 'Domestic Violence', 'Child Custody', 'Party Autonomy']
    },
    {
        id: 'investment-treaty-arbitration-2024',
        title: 'Reforming Investment Treaty Arbitration: Sovereignty, Legitimacy, and Systemic Concerns',
        abstract: 'This article critically examines ongoing reform efforts in investment treaty arbitration, analyzing proposals for a multilateral investment court and their implications for state sovereignty and democratic governance.',
        content: '<p>Investment treaty arbitration has emerged as one of the most contested areas of international law, generating significant debate regarding its impact on regulatory autonomy and the legitimacy of investor-state dispute settlement mechanisms.</p><h2>The Legitimacy Crisis</h2><p>Critics have raised substantive concerns regarding the investment arbitration system, including: inconsistent interpretations of broadly worded treaty standards; the absence of an appellate mechanism; questions regarding arbitrator independence; and the chilling effect on regulatory measures in the public interest.</p><h2>Reform Proposals</h2><p>The UNCITRAL Working Group III has been engaged in comprehensive reform discussions since 2017, considering options ranging from incremental procedural reforms to fundamental structural changes including the establishment of a standing investment court.</p><h2>The Multilateral Investment Court</h2><p>The European Union has emerged as the principal proponent of a multilateral investment court, arguing that adjudication by tenured judges would address legitimacy concerns associated with ad hoc arbitration.</p><h2>Implications for India</h2><p>India has adopted a cautious approach to investment treaty arbitration, having terminated numerous bilateral investment treaties following adverse arbitral awards. The ongoing reform discussions present opportunities for India to shape the evolution of the investment dispute settlement architecture.</p>',
        category: 'Arbitration',
        author: 'Adv. Rahul Mehta',
        authorAffiliation: 'Centre for International Law, GNLU',
        date: '2024-01-02',
        status: 'published',
        keywords: ['Investment Arbitration', 'ISDS Reform', 'Multilateral Investment Court', 'Sovereignty']
    },
    {
        id: 'commercial-mediation-india-2023',
        title: 'The Commercial Courts Act and Institutionalization of Mediation in India',
        abstract: 'Analyzing the impact of the Commercial Courts Act, 2015 and its subsequent amendments on the development of institutional commercial mediation in India.',
        content: '<p>The Commercial Courts Act, 2015 represents a significant legislative intervention aimed at improving the efficiency of commercial dispute resolution in India. The mandatory pre-institution mediation requirement introduced by the 2018 amendment has particular significance for the development of mediation practice.</p><h2>Legislative Framework</h2><p>Section 12A of the Commercial Courts Act mandates that parties exhaust the remedy of pre-institution mediation before initiating commercial suits, subject to certain exceptions for urgent interim relief.</p><h2>Institutional Development</h2><p>The legislation has catalyzed the establishment and recognition of mediation institutions, though significant variations exist in the quality and consistency of mediation services across different centers.</p><h2>Challenges and Opportunities</h2><p>Key challenges include the perception of mandatory mediation as a procedural hurdle rather than a genuine dispute resolution opportunity, inadequate mediator training, and the absence of comprehensive regulation of mediation practice.</p>',
        category: 'Mediation',
        author: 'Dr. Priya Krishnan',
        authorAffiliation: 'Gujarat National Law University',
        date: '2023-12-20',
        status: 'published',
        keywords: ['Commercial Mediation', 'Commercial Courts Act', 'Mandatory Mediation', 'India']
    },
    {
        id: 'negotiation-theory-practice-2023',
        title: 'Principled Negotiation in Complex Multi-Party Disputes: Theory and Practice',
        abstract: 'Examining the application of principled negotiation frameworks to complex multi-party disputes, with case studies from environmental and infrastructure conflicts.',
        content: '<p>The complexity of contemporary disputes frequently involves multiple stakeholders with divergent interests, hierarchical relationships, and long-term relational considerations that challenge traditional bilateral negotiation models.</p><h2>Theoretical Framework</h2><p>Building on the foundational work of Fisher and Ury, this article examines how principled negotiation concepts require adaptation when applied to multi-party settings with significant power asymmetries.</p><h2>Case Studies</h2><p>Analysis of environmental and infrastructure disputes reveals the importance of process design, stakeholder mapping, and sequencing of negotiations in achieving sustainable outcomes.</p><h2>Practitioner Insights</h2><p>Experienced practitioners emphasize the value of building coalitions, identifying shared interests across party groupings, and developing creative options that expand the negotiation space beyond zero-sum allocations.</p>',
        category: 'Negotiation',
        author: 'Prof. Sanjay Agarwal',
        authorAffiliation: 'National Academy of Legal Studies and Research',
        date: '2023-12-15',
        status: 'published',
        keywords: ['Multi-Party Negotiation', 'Principled Negotiation', 'Environmental Disputes', 'Conflict Resolution']
    },
    {
        id: 'conciliation-labour-disputes-2023',
        title: 'Conciliation in Labour Disputes: Assessing the Effectiveness of Statutory Mechanisms',
        abstract: 'A comprehensive assessment of conciliation processes under Indian labour law, examining institutional effectiveness and proposing reforms aligned with the new Labour Codes.',
        content: '<p>Conciliation has historically occupied a central position in the resolution of industrial disputes in India, with statutory frameworks establishing elaborate procedures for government-facilitated dispute resolution.</p><h2>Statutory Framework</h2><p>The Industrial Disputes Act, 1947 established the framework for conciliation proceedings, which has been substantially modified by the Industrial Relations Code, 2020.</p><h2>Empirical Assessment</h2><p>Data from state labour departments reveals significant variations in conciliation success rates, with factors including conciliator expertise, party engagement, and the nature of disputes influencing outcomes.</p><h2>Reform Proposals</h2><p>The transition to the new Labour Codes presents opportunities for strengthening conciliation mechanisms through enhanced training, clearer procedural timelines, and integration with online dispute resolution platforms.</p>',
        category: 'Conciliation',
        author: 'Dr. Meera Nair',
        authorAffiliation: 'V.M. Salgaocar College of Law',
        date: '2023-12-10',
        status: 'published',
        keywords: ['Labour Disputes', 'Conciliation', 'Industrial Relations', 'Labour Codes']
    }
];

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const storage = new GitHubStorage();
        const submissions = await storage.getSubmissions();

        // Filter for published submissions
        let posts = submissions.filter(s => s.status === 'published');

        // If no published submissions, use sample posts
        if (posts.length === 0) {
            posts = samplePosts;
        }

        // Transform submissions to post format if needed
        posts = posts.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            content: p.content || '',
            category: p.category,
            author: p.authorName || p.author,
            authorAffiliation: p.authorAffiliation || '',
            date: p.publishedAt?.split('T')[0] || p.date,
            status: 'published',
            keywords: p.keywords || []
        }));

        // Sort by date descending
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Optional filtering
        const { category, limit } = req.query;
        if (category && category !== 'all') {
            posts = posts.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        }
        if (limit) {
            posts = posts.slice(0, parseInt(limit));
        }

        return res.status(200).json({
            success: true,
            data: posts,
            total: posts.length
        });
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to sample posts on error
        return res.status(200).json({
            success: true,
            data: samplePosts,
            total: samplePosts.length,
            fallback: true
        });
    }
};

module.exports = allowCors(handler);
