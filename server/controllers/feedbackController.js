const Feedback = require('../models/Feedback');

exports.submitFeedback = async (req, res) => {
    try {
        const { title, content, type, email } = req.body;
        const userId = req.user?._id;

        console.log('[FEEDBACK] Incoming submission:', { title, type, email, userId: userId?.toString() || 'anonymous' });

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Tiêu đề và nội dung là bắt buộc'
            });
        }

        const feedback = await Feedback.create({
            userId,
            title,
            content,
            type: type || 'other',
            email,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Cảm ơn bạn đã đóng góp ý kiến!',
            data: feedback
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi góp ý'
        });
    }
};
