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
        const { idToken, accessToken } = req.body;

        if (!idToken && !accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Token Google không được cung cấp'
            });
        }

        let googleId, email, name, picture;

        if (idToken) {
            // Verify Google idToken
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            googleId = payload.sub;
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
        } else if (accessToken) {
            // Fetch user info using accessToken
            const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
            const data = await response.json();

            if (data.error || !data.sub) {
                return res.status(400).json({
                    success: false,
                    message: 'Access Token không hợp lệ'
                });
            }

            googleId = data.sub;
            email = data.email;
            name = data.name;
            picture = data.picture;
        }

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
                isVerified: true, // Google already verified the email
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

        // Determine environment to set cookie attributes correctly
        // FIX: Check Origin header to force SameSite=None for cross-site requests (Cloudflare Pages -> VPS)
        const origin = req.headers.origin || '';
        const isProduction = process.env.NODE_ENV === 'production' ||
            (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) ||
            (origin && !origin.includes('localhost') && origin.startsWith('http'));

        // Set HttpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction, // Required for SameSite=None
            sameSite: isProduction ? 'none' : 'lax', // Required for cross-site cookie
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
                },
                token
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
        // Check if user has password
        const userFull = await User.findById(user._id).select('password');
        const hasPassword = !!(userFull && userFull.password);

        // Calculate isPremium from subscription
        const isPremium = user.subscription &&
            user.subscription.tier === 'premium' &&
            user.subscription.status === 'active';

        res.json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                displayName: user.displayName,
                avatar: user.avatar,
                role: user.role,
                subscription: user.subscription,
                isPremium,
                hasPassword
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

        // Generate verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');

        // Create user (Not verified yet)
        const user = await User.create({
            displayName,
            email,
            password: hashedPassword,
            role: 'user',
            verificationToken: verificationTokenHash,
            verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        // Send verification email
        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
        const htmlContent = `
            <h1>Xác thực tài khoản PChill</h1>
            <p>Cảm ơn bạn đã đăng ký. Vui lòng click vào link dưới đây để kích hoạt tài khoản:</p>
            <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
            <p>Link này sẽ hết hạn sau 24 giờ.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Xác thực tài khoản - PChill Film',
                html: htmlContent
            });

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.'
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);

            // Even if email fails, user account is created
            // They can resend verification email later
            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công! Email xác thực sẽ được gửi sau. Bạn có thể yêu cầu gửi lại từ trang đăng nhập.',
                emailSent: false
            });
        }
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ' });
        }

        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            verificationToken: verificationTokenHash,
            verificationTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        // Verify user
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        // Auto login after verification using existing method logic
        const jwtToken = generateToken(user._id);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Xác thực tài khoản thành công',
            data: {
                user: {
                    id: user._id,
                    displayName: user.displayName,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                },
                token: jwtToken
            }
        });

    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xác thực email' });
    }
};


// Resend Verification Email
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Tài khoản này đã được xác thực' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');

        user.verificationToken = verificationTokenHash;
        user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();

        // Send verification email
        const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
        const htmlContent = `
            <h1>Xác thực tài khoản PChill (Gửi lại)</h1>
            <p>Bạn đã yêu cầu gửi lại email xác thực. Vui lòng click vào link dưới đây để kích hoạt tài khoản:</p>
            <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
            <p>Link này sẽ hết hạn sau 24 giờ.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Xác thực tài khoản - PChill Film',
                html: htmlContent
            });

            res.json({
                success: true,
                message: 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư đến.'
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            user.verificationToken = undefined;
            user.verificationTokenExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Lỗi gửi email xác thực' });
        }

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
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
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email của bạn.'
            });
        }

        // Login success
        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
                },
                token
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

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        if (!user.password) {
            return res.status(400).json({ success: false, message: 'Tài khoản này đăng nhập bằng Google, không thể đổi mật khẩu.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Profile (Avatar/DisplayName)
exports.updateProfile = async (req, res) => {
    try {
        const { displayName, avatar } = req.body;
        const user = await User.findById(req.user._id);

        if (displayName) user.displayName = displayName;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role,
                    subscription: user.subscription
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
