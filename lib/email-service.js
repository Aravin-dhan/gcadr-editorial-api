// Email Service using Resend
// Sends notifications for editorial workflow

const { Resend } = require('resend');

class EmailService {
    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@gcadr.in';
    }

    async send(to, subject, html, text = null) {
        try {
            const response = await this.resend.emails.send({
                from: `GCADR Blog <${this.fromEmail}>`,
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html,
                text: text || this.stripHtml(html)
            });
            return { success: true, id: response.id };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Pre-built email templates
    async sendSubmissionReceived(authorEmail, authorName, title, submissionId) {
        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0e2a47; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">GCADR Blog</h1>
                    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Submission Received</p>
                </div>
                <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
                    <p>Dear ${authorName},</p>
                    <p>Thank you for submitting your article to the GCADR Blog. We have received your submission:</p>
                    <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #b4975a; margin: 16px 0;">
                        <strong>${title}</strong><br>
                        <small style="color: #666;">Reference: ${submissionId}</small>
                    </div>
                    <p>Your article will now go through our editorial review process:</p>
                    <ol style="color: #444;">
                        <li>Copy Editing Review (Grammar, Formatting, Plagiarism Check)</li>
                        <li>Associate Editor Review (Content & Flow)</li>
                        <li>Senior Editor Review (Final Approval)</li>
                    </ol>
                    <p>You will receive updates as your article progresses through each stage.</p>
                    <p style="margin-top: 24px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        <strong>GCADR Editorial Team</strong>
                    </p>
                </div>
            </div>
        `;
        return this.send(authorEmail, `Submission Received: ${title}`, html);
    }

    async sendStatusUpdate(authorEmail, authorName, title, status, feedback = null) {
        const statusMessages = {
            'ce_review': 'Your article is now being reviewed by our Copy Editor.',
            'ae_review': 'Your article has passed Copy Editing and is now with our Associate Editor.',
            'se_review': 'Your article is in the final review stage with our Senior Editor.',
            'author_revision': 'Our editors have provided feedback. Please review and revise your article.',
            'approved': 'Congratulations! Your article has been approved for publication.',
            'published': '🎉 Your article has been published on the GCADR Blog!',
            'rejected': 'Unfortunately, your article could not be accepted at this time.'
        };

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0e2a47; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">GCADR Blog</h1>
                    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Article Status Update</p>
                </div>
                <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
                    <p>Dear ${authorName},</p>
                    <p>There's an update on your article:</p>
                    <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #b4975a; margin: 16px 0;">
                        <strong>${title}</strong>
                    </div>
                    <p><strong>Status:</strong> ${status.replace(/_/g, ' ').toUpperCase()}</p>
                    <p>${statusMessages[status] || 'Your article status has been updated.'}</p>
                    ${feedback ? `
                        <div style="background: #fff3e0; padding: 16px; border-radius: 6px; margin: 16px 0;">
                            <strong>Editor Feedback:</strong>
                            <p style="margin: 8px 0 0; white-space: pre-wrap;">${feedback}</p>
                        </div>
                    ` : ''}
                    <p style="margin-top: 24px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        <strong>GCADR Editorial Team</strong>
                    </p>
                </div>
            </div>
        `;
        return this.send(authorEmail, `Article Update: ${title}`, html);
    }

    async sendEditorNotification(editorEmail, editorName, title, action) {
        const actionMessages = {
            'assigned': 'A new article has been assigned to you for review.',
            'ready_for_review': 'The previous review stage is complete. This article is now ready for your review.',
            'revision_submitted': 'The author has submitted a revised version of their article.'
        };

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0e2a47; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">GCADR Editorial</h1>
                    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">New Action Required</p>
                </div>
                <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
                    <p>Hi ${editorName},</p>
                    <p>${actionMessages[action] || 'You have a new notification.'}</p>
                    <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #b4975a; margin: 16px 0;">
                        <strong>${title}</strong>
                    </div>
                    <p>
                        <a href="https://blog.gcadr.in/editorial-panel.html" 
                           style="display: inline-block; background: #0e2a47; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; font-weight: 600;">
                            Open Editorial Dashboard
                        </a>
                    </p>
                    <p style="margin-top: 24px; color: #666; font-size: 14px;">
                        — GCADR Editorial System
                    </p>
                </div>
            </div>
        `;
        return this.send(editorEmail, `Action Required: ${title}`, html);
    }
}

module.exports = EmailService;
