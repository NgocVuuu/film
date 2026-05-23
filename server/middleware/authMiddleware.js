const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header, cookie, or query param (for sendBeacon fallback)
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.query && req.query._token) {
            token = req.query._token;
        }

        if (!token || token === 'undefined' || token === 'null') {
            console.log(`[AuthMiddleware] 401 Unauthorized for ${req.originalUrl}. Headers:`, req.headers.authorization, 'Cookies:', !!req.cookies?.token);
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để tiếp tục'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId).select('-__v');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập'
        });
    }
    next();
};

// Optional auth - doesn't fail if no token
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (token && token !== 'undefined' && token !== 'null') {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-__v');
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Silently fail for optional auth
    }
    next();
};

// Middleware to check if user has premium subscription
const premiumMiddleware = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để tiếp tục'
        });
    }

    // Allow admins to access premium features
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if user has active premium subscription (premium OR vip both qualify for premium features)
    const isPremium = req.user.subscription &&
        (req.user.subscription.tier === 'premium' || req.user.subscription.tier === 'vip') &&
        req.user.subscription.status === 'active';

    // Check if subscription has not expired (if endDate exists)
    const isNotExpired = !req.user.subscription?.endDate ||
        new Date(req.user.subscription.endDate) > new Date();

    if (!isPremium || !isNotExpired) {
        console.log(`[DEBUG] Premium check failed for user: ${req.user.email}`);
        console.log(`- isPremium: ${isPremium}, isNotExpired: ${isNotExpired}`);
        console.log(`- Tier: ${req.user.subscription?.tier}, Status: ${req.user.subscription?.status}`);
        console.log(`- EndDate: ${req.user.subscription?.endDate}`);

        return res.status(403).json({
            success: false,
            message: 'Tính năng này chỉ dành cho thành viên Premium',
            requiresPremium: true
        });
    }

    next();
};

// Middleware to check if user has VIP subscription (or is admin)
const vipMiddleware = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để tiếp tục'
        });
    }

    // Allow admins
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if user has active VIP subscription
    const isVip = req.user.subscription &&
        req.user.subscription.tier === 'vip' &&
        req.user.subscription.status === 'active';

    const isNotExpired = !req.user.subscription?.endDate ||
        new Date(req.user.subscription.endDate) > new Date();

    if (!isVip || !isNotExpired) {
        return res.status(403).json({
            success: false,
            message: 'Tính năng này chỉ dành cho thành viên PChill VIP',
            requiresVip: true
        });
    }

    next();
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware,
    premiumMiddleware,
    vipMiddleware,
    protect: authMiddleware, // Alias
    admin: adminMiddleware   // Alias
};
