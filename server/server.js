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
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminUpgradeRoutes = require('./routes/adminUpgradeRoutes');
const adminDramaRoutes = require('./routes/adminDramaRoutes');
const { authMiddleware, adminMiddleware } = require('./middleware/authMiddleware');
const movieRoutes = require('./routes/movieRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentRoutes = require('./routes/commentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const movieListRoutes = require('./routes/movieListRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const chatRoutes = require('./routes/chatRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const ChatConversation = require('./models/ChatConversation');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');

// Khởi chạy trình lập lịch cào phim 4K tự động
require('./cron_4k_scheduler');
// Khởi chạy hàng đợi Worker xử lý cào/upload phim ngầm
// Worker no longer needed, using in-memory queue


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
global.io = io; // Expose globally for background workers like hostManager

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

// Mảng lưu trạng thái các phòng Watch Party trong RAM
const wpRooms = {};

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

    // --- WATCH PARTY LOGIC ---
    socket.on('wp_join_room', ({ roomId, user: sender }) => {
        if (!wpRooms[roomId]) {
            wpRooms[roomId] = {
                host: socket.id,
                hostUser: sender,
                users: []
            };
        }
        
        // Ensure user is not duplicated
        const existingUser = wpRooms[roomId].users.find(u => u.id === socket.id);
        
        if (!existingUser) {
            // Check room limit (Max 3 users: 1 host + 2 guests)
            if (wpRooms[roomId].users.length >= 3) {
                socket.emit('wp_error', { message: 'Phòng đã đầy (Tối đa 3 người).' });
                return;
            }
            wpRooms[roomId].users.push({ id: socket.id, ...sender });
        }

        socket.join(`wp_${roomId}`);
        io.to(`wp_${roomId}`).emit('wp_room_update', wpRooms[roomId]);
    });

    socket.on('wp_play', ({ roomId, time }) => {
        const room = wpRooms[roomId];
        if (room && room.host === socket.id) {
            socket.to(`wp_${roomId}`).emit('wp_play_action', { time });
        }
    });

    socket.on('wp_pause', ({ roomId, time }) => {
        const room = wpRooms[roomId];
        if (room && room.host === socket.id) {
            socket.to(`wp_${roomId}`).emit('wp_pause_action', { time });
        }
    });

    socket.on('wp_seek', ({ roomId, time }) => {
        const room = wpRooms[roomId];
        if (room && room.host === socket.id) {
            socket.to(`wp_${roomId}`).emit('wp_seek_action', { time });
        }
    });

    socket.on('wp_request_sync', ({ roomId }) => {
        const room = wpRooms[roomId];
        if (room && room.host) {
            // Yêu cầu Host gửi trạng thái hiện tại
            io.to(room.host).emit('wp_request_sync_action', { requesterId: socket.id });
        }
    });

    socket.on('wp_sync_state', ({ requesterId, state }) => {
        // Nhận trạng thái từ Host và gửi cho Guest đang yêu cầu
        io.to(requesterId).emit('wp_sync_state_action', state);
    });

    socket.on('wp_change_episode', ({ roomId, serverName, episodeSlug }) => {
        const room = wpRooms[roomId];
        if (room && room.host === socket.id) {
            socket.to(`wp_${roomId}`).emit('wp_change_episode_action', { serverName, episodeSlug });
        }
    });

    socket.on('wp_chat', ({ roomId, message, sender }) => {
        io.to(`wp_${roomId}`).emit('wp_chat_message', { sender, message, time: new Date() });
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${user.displayName}`);
        
        // Remove from WP rooms
        for (const roomId in wpRooms) {
            const room = wpRooms[roomId];
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                if (room.host === socket.id) {
                    if (room.users.length > 0) {
                        room.host = room.users[0].id;
                        room.hostUser = room.users[0];
                    } else {
                        delete wpRooms[roomId];
                        continue;
                    }
                }
                io.to(`wp_${roomId}`).emit('wp_room_update', wpRooms[roomId]);
            }
        }
    });
});

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
// Capture raw body for sendBeacon requests (Content-Type: application/octet-stream or text/plain)
app.use((req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('octet-stream') || (ct.includes('text/plain') && req.path.includes('/api/progress'))) {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            req.rawBody = data;
            try { req.body = JSON.parse(data); } catch { req.body = {}; }
            next();
        });
    } else {
        next();
    }
});
app.use(express.json());
app.use(cookieParser());
// Morgan logging: dev mode locally, combined (skip progress spam) in production
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        skip: (req) => req.url.startsWith('/api/progress') // Bỏ qua progress saves (spam khi 200+ users xem phim)
    }));
}

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
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000
})
    .then(() => {
        console.log('Đã kết nối MongoDB');
        setupCrawler();
        
        // Bắt đầu Status Poller kiểm tra Abysss/Gofile processing
        const { startStatusPoller } = require('./utils/statusPoller');
        startStatusPoller();
        
        // syncMovies(); // Uncomment to run immediately
    })
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Auth Rate Limiting (Strict)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for auth routes
    message: { success: false, message: 'Bạn đã đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Auth Routes
app.use('/api/auth', authRoutes);

// Progress Routes
app.use('/api/progress', progressRoutes);

// Search Routes
app.use('/api/search', searchRoutes);

// Subscription Routes
app.use('/api/subscriptions', subscriptionRoutes);

// User Routes
app.use('/api/users', userRoutes);

// Admin Routes
const pipelineRoutes = require('./admin_api');
app.use('/api/admin/pipeline', authMiddleware, adminMiddleware, pipelineRoutes);
app.use('/api/admin/upgrades', adminUpgradeRoutes);
app.use('/api/admin/drama', adminDramaRoutes);
app.use('/api/admin', adminRoutes);

// Cron Routes
// Removed webhook for cron

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
app.use('/api/chat', chatRoutes);
app.use('/api/proxy', proxyRoutes);

// Error Handler (Last Middleware)
app.use(errorHandler);

httpServer.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});

module.exports = { app, io, httpServer };
