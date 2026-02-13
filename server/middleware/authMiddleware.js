const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header or cookie
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để tiếp tục'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

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
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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

    // Check if user has active premium subscription
    const isPremium = req.user.subscription &&
        req.user.subscription.tier === 'premium' &&
        req.user.subscription.status === 'active';

    // Check if subscription has not expired
    const isNotExpired = req.user.subscription?.endDate &&
        new Date(req.user.subscription.endDate) > new Date();

    if (!isPremium || !isNotExpired) {
        return res.status(403).json({
            success: false,
            message: 'Tính năng này chỉ dành cho thành viên Premium',
            requiresPremium: true
        });
    }

    next();
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware,
    premiumMiddleware,
    protect: authMiddleware, // Alias
    admin: adminMiddleware   // Alias
};
