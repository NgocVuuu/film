const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Initialize Firebase Admin (you'll need to add service account JSON)
let firebaseInitialized = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
    } catch (error) {
        console.error('Firebase initialization error:', error.message);
    }
}

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Google OAuth Login
exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'Token Google không được cung cấp'
            });
        }

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Find or create user
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check if email already exists with different auth method
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email này đã được đăng ký bằng phương thức khác'
                });
            }

            // Create new user
            user = await User.create({
                googleId,
                email,
                displayName: name,
                avatar: picture,
                lastLogin: new Date(),
                role: email === 'vupaul2001@gmail.com' ? 'admin' : 'user'
            });
        } else {
            // Update last login & Admin role if needed
            if (user.email === 'vupaul2001@gmail.com' && user.role !== 'admin') {
                user.role = 'admin';
            }
            user.lastLogin = new Date();
            await user.save();
        }

        // Generate JWT
        const token = generateToken(user._id);

        // Set HttpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role,
                    subscription: user.subscription
                }
            },
            message: 'Đăng nhập thành công'
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đăng nhập bằng Google'
        });
    }
};



// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        res.json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                displayName: user.displayName,
                avatar: user.avatar,
                role: user.role,
                subscription: user.subscription
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin người dùng'
        });
    }
};

// Logout (mainly for client-side token removal)
exports.logout = async (req, res) => {
    try {
        res.clearCookie('token');
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đăng xuất'
        });
    }
};

// Register User
exports.register = async (req, res) => {
    try {
        const { displayName, email, password } = req.body;

        if (!displayName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email này đã được sử dụng' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            displayName,
            email,
            password: hashedPassword,
            role: 'user'
        });

        // Generate token and respond
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            data: { user: { id: user._id, displayName: user.displayName, email: user.email, role: user.role, avatar: user.avatar } },
            message: 'Đăng ký thành công'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Login User (Email/Password)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        // Check user
        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        // Login success
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        if (user.email === 'vupaul2001@gmail.com' && user.role !== 'admin') {
            user.role = 'admin';
        }
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role,
                    subscription: user.subscription
                }
            },
            message: 'Đăng nhập thành công'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này.' });
        }

        if (!user.password) {
            return res.status(400).json({ success: false, message: 'Tài khoản này đăng nhập bằng Google/OTP, không thể đặt lại mật khẩu.' });
        }

        // Generate Token
        // Using crypto for a simple token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Expiration (10 mins)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        // Currently client is localhost:3000
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        const message = `Bạn nhận được email này vì yêu cầu đặt lại mật khẩu.\n\nHãy nhấp vào liên kết sau để đặt lại mật khẩu:\n\n${resetUrl}\n\nLiên kết này sẽ hết hạn trong 10 phút.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Yêu cầu đặt lại mật khẩu - Film App',
                message
            });

            res.json({ success: true, message: 'Email đặt lại mật khẩu đã được gửi.' });
        } catch (err) {
            console.error('Email send failed:', err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, message: 'Không thể gửi email. Vui lòng thử lại sau.' });
        }

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Hash token to compare
        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // Log user in automatically? Or ask to login.
        // Let's return success and ask to login.
        res.json({ success: true, message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
