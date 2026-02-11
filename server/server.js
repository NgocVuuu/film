const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
// const xss = require('xss-clean'); // Incompatible with Express 5
const hpp = require('hpp');
// const mongoSanitize = require('express-mongo-sanitize'); // Incompatible with Express 5
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorMiddleware');
require('dotenv').config();

const Movie = require('./models/Movie');
const { setupCrawler, syncMovies } = require('./crawler');
const authRoutes = require('./routes/authRoutes');
const progressRoutes = require('./routes/progressRoutes');
const searchRoutes = require('./routes/searchRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const movieRoutes = require('./routes/movieRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentRoutes = require('./routes/commentRoutes');
const reportRoutes = require('./routes/reportRoutes'); // Added

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

// Trust Proxy (Required for Cookie Safe/Secure across proxies like Cloudflare/Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://film-xt3.pages.dev',
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Security Middleware
app.use(helmet());

// Custom Mongo Sanitize (In-place to support Express 5)
app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (obj instanceof Object) {
            for (const key in obj) {
                if (/^\$/.test(key)) {
                    delete obj[key];
                } else {
                    sanitize(obj[key]);
                }
            }
        }
    };
    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);
    next();
});

// app.use(xss()); // Incompatible
app.use(hpp());

// Rate Limiting (100 requests per 10 minutes)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100
});
app.use('/api', limiter);

// Connect DB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Đã kết nối MongoDB');
        setupCrawler();
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

// Health Check
app.get('/', (req, res) => {
    res.send('Server is running...');
});

// Routes

// 1, 2, 3. Movie Routes (List, Search, Detail, Home)
app.use('/api', movieRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);

// Comments
app.use('/api/comments', commentRoutes);
app.use('/api/reports', reportRoutes);

// Error Handler (Last Middleware)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
