const sendEmail = require('../utils/sendEmail');

// Test email endpoint (admin only)
exports.testEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email không được cung cấp'
            });
        }

        const testHtml = `
            <h1>Test Email từ PChill</h1>
            <p>Đây là email test từ hệ thống PChill Film.</p>
            <p>Nếu bạn nhận được email này, nghĩa là SMTP đang hoạt động bình thường.</p>
            <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
        `;

        await sendEmail({
            email: email,
            subject: 'Test Email - PChill Film System',
            html: testHtml
        });

        res.json({
            success: true,
            message: `Email test đã được gửi thành công đến ${email}`
        });

    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi gửi email test',
            error: error.message
        });
    }
};
