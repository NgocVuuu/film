const Payment = require('../models/Payment');
const User = require('../models/User');

// Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status; // active, expired

        const query = {};

        if (status === 'active') {
            query['subscription.status'] = 'active';
            query['subscription.endDate'] = { $gt: new Date() };
        } else if (status === 'expired') {
            query.$or = [
                { 'subscription.status': 'expired' },
                { 'subscription.endDate': { $lte: new Date() } }
            ];
        }

        const users = await User.find(query)
            .select('displayName email phoneNumber subscription createdAt')
            .sort({ 'subscription.endDate': -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đăng ký'
        });
    }
};

// Cancel user subscription
exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        user.subscription = {
            tier: 'free',
            status: 'cancelled',
            startDate: user.subscription.startDate,
            endDate: new Date(), // End immediately
            autoRenew: false
        };
        await user.save();

        res.json({
            success: true,
            data: user.subscription,
            message: 'Đã hủy đăng ký'
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đăng ký'
        });
    }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        const query = status ? { status } : {};

        const payments = await Payment.find(query)
            .populate('userId', 'displayName email phoneNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách thanh toán'
        });
    }
};
