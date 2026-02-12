const User = require('../models/User');
const Payment = require('../models/Payment');
const WatchProgress = require('../models/WatchProgress');

// Get all users with pagination and filters
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const role = req.query.role;
        const status = req.query.status; // active, banned

        const query = {};

        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role;
        }

        if (status === 'banned') {
            query.isBanned = true;
        } else if (status === 'active') {
            query.isBanned = { $ne: true };
        }

        const users = await User.find(query)
            .select('-__v')
            .sort({ createdAt: -1 })
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
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách người dùng'
        });
    }
};

// Get user details with stats
exports.getUserDetails = async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId).select('-__v');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Get user stats
        const paymentCount = await Payment.countDocuments({ userId });
        const totalSpent = await Payment.aggregate([
            { $match: { userId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const watchProgressCount = await WatchProgress.countDocuments({ userId });

        res.json({
            success: true,
            data: {
                user,
                stats: {
                    totalPayments: paymentCount,
                    totalSpent: totalSpent[0]?.total || 0,
                    watchProgressCount
                }
            }
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin người dùng'
        });
    }
};

// Ban/unban user
exports.toggleBanUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { isBanned, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        user.isBanned = isBanned;
        if (isBanned && reason) {
            user.banReason = reason;
        } else {
            user.banReason = undefined;
        }
        await user.save();

        res.json({
            success: true,
            data: user,
            message: isBanned ? 'Đã cấm người dùng' : 'Đã bỏ cấm người dùng'
        });
    } catch (error) {
        console.error('Toggle ban user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái'
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Prevent deleting admin accounts
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không thể xóa tài khoản admin'
            });
        }

        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'Đã xóa người dùng'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa người dùng'
        });
    }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const Movie = require('../models/Movie');

        // Total users
        const totalUsers = await User.countDocuments();

        // Active subscriptions
        const activeSubscriptions = await User.countDocuments({
            'subscription.status': 'active',
            'subscription.endDate': { $gt: new Date() }
        });

        // Total revenue
        const revenueData = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;

        // New users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUsersLast7Days = await User.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        // New users this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        // Active users (logged in last 7 days)
        const activeUsers = await User.countDocuments({
            lastLogin: { $gte: sevenDaysAgo }
        });

        // Total movies
        const totalMovies = await Movie.countDocuments({ isActive: { $ne: false } });

        // Total watch progress
        const totalWatchProgress = await WatchProgress.countDocuments();

        // Top 10 movies by views
        const topMovies = await Movie.find({ isActive: { $ne: false } })
            .sort({ view: -1 })
            .limit(10)
            .select('name slug thumb_url view type');

        // View trends - last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const viewTrends = await WatchProgress.aggregate([
            {
                $match: {
                    updatedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // User registration trends - last 30 days
        const userTrends = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                activeSubscriptions,
                totalRevenue,
                newUsersLast7Days,
                newUsersThisMonth,
                activeUsers,
                totalMovies,
                totalWatchProgress,
                topMovies,
                viewTrends: viewTrends.map(item => ({
                    date: item._id,
                    views: item.count
                })),
                userTrends: userTrends.map(item => ({
                    date: item._id,
                    users: item.count
                }))
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê'
        });
    }
};
