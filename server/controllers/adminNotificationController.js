const Notification = require('../models/Notification');
const User = require('../models/User');

// Broadcast notification to all users
exports.broadcastNotification = async (req, res) => {
    try {
        const { content, link, type } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung thông báo' });
        }

        // Get all active users
        const users = await User.find({}).select('_id');

        // Create notifications for all users and send push
        const { sendToMultiple } = require('../utils/notificationService');

        await sendToMultiple(users.map(u => u._id.toString()), {
            content,
            link: link || '/',
            type: type || 'system',
            title: 'Thông báo từ Pchill'
        });

        res.json({
            success: true,
            message: `Đã gửi thông báo đến ${users.length} người dùng`
        });
    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send notification to specific user (by ID or Email)
exports.sendToUser = async (req, res) => {
    try {
        const { userId } = req.params; // This can be an ID or an Email
        const { content, link, type } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung thông báo' });
        }

        let user;
        // Check if userId is a valid MongoDB ObjectId, if not, try finding by email
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(userId);
        } else {
            user = await User.findOne({ email: userId.toLowerCase() });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng (ID hoặc Email không tồn tại)' });
        }

        const notification = await Notification.create({
            recipient: user._id,
            content,
            link: link || '/',
            type: type || 'system'
        });

        res.json({
            success: true,
            message: `Đã gửi thông báo đến ${user.displayName} (${user.email || 'không có email'})`,
            data: notification
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get sent notifications (for admin history)
exports.getSentNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Group by content to show unique broadcasts
        const notifications = await Notification.aggregate([
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: { content: '$content', createdAt: '$createdAt', type: '$type' },
                    count: { $sum: 1 },
                    firstId: { $first: '$_id' }
                }
            },
            {
                $sort: { '_id.createdAt': -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        const total = await Notification.aggregate([
            {
                $group: {
                    _id: { content: '$content', createdAt: '$createdAt' }
                }
            },
            {
                $count: 'total'
            }
        ]);

        res.json({
            success: true,
            data: notifications.map(n => ({
                content: n._id.content,
                type: n._id.type,
                createdAt: n._id.createdAt,
                recipientCount: n.count
            })),
            pagination: {
                page,
                limit,
                total: total[0]?.total || 0,
                totalPages: Math.ceil((total[0]?.total || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Get sent notifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
