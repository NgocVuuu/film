const { Resend } = require('resend');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend service
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
const sendEmail = async (options) => {
    try {
        // Validate API key
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured');
        }

        const { data, error } = await resend.emails.send({
            from: `${process.env.FROM_NAME || 'PChill'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: options.email,
            subject: options.subject,
            html: options.html,
            text: options.text || options.message // Fallback to text if html not provided
        });

        if (error) {
            console.error('Resend API error:', error);
            throw new Error(error.message || 'Failed to send email');
        }

        console.log('Email sent successfully:', data.id);
        return data;

    } catch (error) {
        console.error('Send email error:', error);
        throw error;
    }
};

module.exports = sendEmail;
