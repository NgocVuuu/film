const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const sendTestEmail = async () => {
    console.log('--- Email Config ---');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_EMAIL);
    console.log('Pass:', process.env.SMTP_PASSWORD ? '******' : 'MISSING');
    console.log('From:', process.env.FROM_EMAIL);
    console.log('--------------------');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true, // Enable debug output
        logger: true // Log to console
    });

    try {
        const info = await transporter.sendMail({
            from: `Test Script <${process.env.SMTP_EMAIL}>`,
            to: 'vupaul2001@gmail.com',
            subject: 'Test Email from Film App Verification Debug',
            text: 'If you receive this, SMTP is working correctly.'
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

sendTestEmail();
