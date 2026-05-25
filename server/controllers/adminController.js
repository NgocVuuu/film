const User = require('../models/User');
const Payment = require('../models/Payment');
const WatchProgress = require('../models/WatchProgress');
const { getTmdbTrendingMovies } = require('./movieController');

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

// Manual upgrade user to premium or VIP (with cumulative months)
exports.manualUpgradePremium = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { months = 1, tier = 'premium' } = req.body;

        if (!['premium', 'vip'].includes(tier)) {
            return res.status(400).json({
                success: false,
                message: 'Tier không hợp lệ. Chỉ chấp nhận: premium, vip'
            });
        }

        const monthsInt = Math.max(1, parseInt(months) || 1);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Cumulative stacking: if user has active subscription, extend from endDate
        const now = new Date();
        const existingEndDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
        const baseDate = (existingEndDate && existingEndDate > now) ? existingEndDate : now;

        const endDate = new Date(baseDate);
        endDate.setMonth(endDate.getMonth() + monthsInt);

        const startDate = user.subscription?.startDate || now;

        user.subscription = {
            tier,
            status: 'active',
            startDate,
            endDate,
            autoRenew: false
        };

        await user.save();

        const tierLabel = tier === 'vip' ? '💎 PChill VIP' : '🏅 Premium';
        const { sendNotification } = require('../utils/notificationService');
        await sendNotification(user._id, {
            title: `Nâng cấp ${tierLabel}`,
            content: `Chúc mừng! Tài khoản của bạn đã được nâng cấp lên ${tierLabel} (+${monthsInt} tháng) bởi Admin. Hạn dùng đến: ${endDate.toLocaleDateString('vi-VN')}.`,
            type: 'system',
            link: '/profile'
        });

        res.json({
            success: true,
            message: `Đã nâng cấp ${tierLabel} cho ${user.displayName} (+${monthsInt} tháng), hạn đến: ${endDate.toLocaleDateString('vi-VN')}`,
            data: user
        });
    } catch (error) {
        console.error('Manual upgrade premium error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi nâng cấp'
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
        const Report = require('../models/Report');
        const MovieRequest = require('../models/MovieRequest');
        const UpgradeRequest = require('../models/UpgradeRequest');

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

        // Top 10 movies by TMDB trending (same as home page)
        const { allTrending, seriesTrending, movieTrending } = await getTmdbTrendingMovies();
        const topMovies = allTrending
            .slice(0, 10)
            .map(m => ({ name: m.name, slug: m.slug, thumb_url: m.thumb_url, view: m.view || 0, type: m.type }));

        // View trends - last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ViewLog = require('../models/ViewLog');
        const viewTrends = await ViewLog.aggregate([
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

        // Tracking & Action Required Data
        const pendingReports = await Report.countDocuments({ status: 'pending' });
        const pending4kRequests = await MovieRequest.countDocuments({ status: 'pending', type: '4k_upgrade' });
        const pendingMovieRequests = await MovieRequest.countDocuments({ status: 'pending', type: 'new_movie' });
        const pendingUpgradeRequests = await UpgradeRequest.countDocuments({ status: 'pending' });
        const systemTracking = {
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };

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
                })),
                tracking: {
                    pendingReports,
                    pending4kRequests,
                    pendingMovieRequests,
                    pendingUpgradeRequests,
                    systemTracking
                }
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

// Crawler Control
const crawler = require('../crawler');

exports.getCrawlerStatus = (req, res) => {
    const status = crawler.getStatus();
    res.json({ success: true, data: status });
};

exports.getCrawlerLogs = (req, res) => {
    const logs = crawler.getLogs();
    res.json({ success: true, data: logs });
};

exports.startCrawler = async (req, res) => {
    const options = req.body; // { full: boolean, fromPage, toPage }
    const result = await crawler.startCrawl(options);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
};

exports.stopCrawler = (req, res) => {
    const result = crawler.stopCrawl();
    res.json(result);
};

// VIP Host Revenue
const { play4meAPI, abyssAPI } = require('../utils/videoHostProviders');

exports.getHostRevenue = async (req, res) => {
    try {
        let play4meBalance = null;
        if (play4meAPI) {
            play4meBalance = await play4meAPI.getBalance();
        }

        let abyssBalance = null;
        if (abyssAPI && typeof abyssAPI.getBalance === 'function') {
            abyssBalance = await abyssAPI.getBalance();
        }

        res.json({
            success: true,
            data: {
                play4me: play4meBalance,
                abyss: abyssBalance
            }
        });
    } catch (error) {
        console.error('Get host revenue error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy doanh thu host VIP' });
    }
};
