const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
// const xss = require('xss-clean'); // Incompatible with Express 5
const hpp = require('hpp');
// const mongoSanitize = require('express-mongo-sanitize'); // Incompatible with Express 5
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const errorHandler = require('./middleware/errorMiddleware');
require('dotenv').config();

const Movie = require('./models/Movie');
const { setupCrawler, syncMovies } = require('./crawler');
const authRoutes = require('./routes/authRoutes');
const progressRoutes = require('./routes/progressRoutes');
const searchRoutes = require('./routes/searchRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminNodeRoutes = require('./routes/adminNodeRoutes');
const adminUpgradeRoutes = require('./routes/adminUpgradeRoutes');
const movieRoutes = require('./routes/movieRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentRoutes = require('./routes/commentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const movieListRoutes = require('./routes/movieListRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const torrentRoutes = require('./routes/torrentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ChatConversation = require('./models/ChatConversation');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

// Trust Proxy (Required for Cookie Safe/Secure across proxies like Cloudflare/Nginx)
app.set('trust proxy', 1);

const allowedOrigins = [
    'http://localhost:3000',
    'https://film-xt3.pages.dev',
    'https://pchill.online',
    (process.env.CLIENT_URL || '').replace(/\/$/, '')
].filter(Boolean);

// Socket.io
const io = new SocketIO(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// Attach io to app so controllers can access it
app.set('io', io);

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
    try {
        let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

        // Fallback to cookie if token is missing
        if (!token && socket.handshake.headers?.cookie) {
            const cookies = socket.handshake.headers.cookie.split(';');
            const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
            if (tokenCookie) {
                token = tokenCookie.split('=')[1];
            }
        }

        if (!token) return next(new Error('Authentication error'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('_id displayName avatar role');
        if (!user) return next(new Error('User not found'));
        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.displayName} (${user.role})`);

    // Join personal room
    socket.join(`user_${user._id}`);
    if (user.role === 'admin') {
        socket.join('admin_room');
    }

    // User joins their conversation room
    socket.on('join_conversation', async (conversationId) => {
        try {
            const conv = await ChatConversation.findById(conversationId);
            if (!conv) return;
            if (user.role !== 'admin' && conv.userId.toString() !== user._id.toString()) return;
            socket.join(`conv_${conversationId}`);
        } catch (err) {
            console.error('[Socket] join_conversation error:', err);
        }
    });

    // Send message
    socket.on('send_message', async ({ conversationId, content }) => {
        try {
            if (!content || !content.trim()) return;

            const conv = await ChatConversation.findById(conversationId);
            if (!conv) return;
            if (user.role !== 'admin' && conv.userId.toString() !== user._id.toString()) return;

            const senderRole = user.role === 'admin' ? 'admin' : 'user';

            const message = await ChatMessage.create({
                conversationId,
                senderId: user._id,
                senderRole,
                content: content.trim()
            });

            await ChatConversation.findByIdAndUpdate(conversationId, {
                lastMessage: content.trim().substring(0, 100),
                lastMessageAt: new Date(),
                $inc: senderRole === 'user' ? { unreadAdmin: 1 } : { unreadUser: 1 }
            });

            const populated = await ChatMessage.findById(message._id)
                .populate('senderId', 'displayName avatar');

            // Emit to conversation room
            io.to(`conv_${conversationId}`).emit('new_message', populated);

            // Also notify admin room for badge update
            io.to('admin_room').emit('conversation_updated', {
                conversationId,
                lastMessage: content.trim().substring(0, 100),
                lastMessageAt: new Date(),
                senderRole
            });

            // Notify the user's personal room
            io.to(`user_${conv.userId}`).emit('conversation_updated', {
                conversationId,
                lastMessage: content.trim().substring(0, 100),
                lastMessageAt: new Date(),
                senderRole
            });
        } catch (err) {
            console.error('[Socket] send_message error:', err);
        }
    });

    // Mark as read
    socket.on('mark_read', async (conversationId) => {
        try {
            const isAdmin = user.role === 'admin';
            await ChatConversation.findByIdAndUpdate(conversationId, {
                [isAdmin ? 'unreadAdmin' : 'unreadUser']: 0
            });
        } catch (err) {
            console.error('[Socket] mark_read error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${user.displayName}`);
    });
});

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google-analytics.com", "https://ssl.google-analytics.com", "https://www.googletagmanager.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from all sources
            connectSrc: ["'self'", "https://api.pchill.online", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https:", "http:"], // Allow video from all sources
            frameSrc: ["'self'", "https://www.youtube.com", "https://www.google.com"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

const mongoSanitize = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else {
                mongoSanitize(obj[key]);
            }
        }
    }
    return obj;
};

// Custom Mongo Sanitize Middleware (In-place)
app.use((req, res, next) => {
    if (req.body) mongoSanitize(req.body);
    if (req.query) mongoSanitize(req.query);
    if (req.params) mongoSanitize(req.params);
    next();
});

// Custom XSS Sanitizer (Alternative to xss-clean for Express 5)
app.use((req, res, next) => {
    const sanitizeXss = (obj) => {
        if (!obj) return null;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'string') {
                    obj[i] = obj[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
                } else if (typeof obj[i] === 'object' && obj[i] !== null) {
                    sanitizeXss(obj[i]);
                }
            }
        } else if (typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (typeof value === 'string') {
                    obj[key] = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                } else if (typeof value === 'object' && value !== null) {
                    sanitizeXss(value);
                }
            });
        }
    };

    if (req.body) sanitizeXss(req.body);
    if (req.query) sanitizeXss(req.query);
    if (req.params) sanitizeXss(req.params);

    next();
});

app.use(hpp());

// Rate Limiting (100 requests per 10 minutes)
// Check for essential environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
    process.exit(1);
}

// Rate Limiting (1000 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Bạn đã yêu cầu quá nhanh, vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Connect DB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Đã kết nối MongoDB');
        setupCrawler();

        // Bắt đầu nhịp tim Health Check quản lý Nginx Proxy Nodes
        const healthCheck = require('./services/healthCheck');
        healthCheck.start();

        // syncMovies(); // Uncomment to run immediately
    })
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Auth Routes
app.use('/api/auth', authRoutes);

// Progress Routes
app.use('/api/progress', progressRoutes);

// Search Routes
app.use('/api/search', searchRoutes);

// Subscription Routes
app.use('/api/subscriptions', subscriptionRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/nodes', adminNodeRoutes);
app.use('/api/admin/upgrades', adminUpgradeRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Server is running...');
});

// Routes

// 1, 2, 3. Movie Routes (List, Search, Detail, Home)
app.use('/api', movieRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/lists', movieListRoutes);
app.use('/api/notifications', notificationRoutes);

// Comments
app.use('/api/comments', commentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/torrent', torrentRoutes);
app.use('/api/chat', chatRoutes);

// Error Handler (Last Middleware)
app.use(errorHandler);

httpServer.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});

module.exports = { app, io, httpServer };
