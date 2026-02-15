const User = require('../models/User');
const realDebrid = require('../utils/realDebrid');

/**
 * Get streaming link for a Torrent magnet
 */
exports.getStreamLink = async (req, res) => {
    try {
        const { magnet } = req.query;
        const userId = req.user._id;

        if (!magnet) {
            return res.status(400).json({ success: false, message: 'Thiếu magnet link' });
        }

        const user = await User.findById(userId);
        if (!user || user.subscription?.tier !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'Chung tôi rất tiếc, tính năng này chỉ dành cho thành viên Premium'
            });
        }

        // Call Real-Debrid service to get direct link
        const streamLink = await realDebrid.getStreamLink(magnet);

        res.json({
            success: true,
            message: 'Đã chuẩn bị luồng Torrent thành công',
            data: {
                streamUrl: streamLink
            }
        });

    } catch (error) {
        console.error('Torrent stream error:', error);

        // Specific error for missing API Key
        if (error.message.includes('REAL_DEBRID_API_KEY')) {
            return res.status(500).json({
                success: false,
                message: 'Hệ thống Torrent đang được bảo trì (API Key missing)'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi khi khởi tạo luồng Torrent. Có thể torrent này chưa được cache hoặc server quá tải.'
        });
    }
};
