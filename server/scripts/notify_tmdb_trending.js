const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const { sendToMultiple } = require('../utils/notificationService');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    console.error('Lỗi: Chưa cấu hình TMDB_API_KEY trong file .env');
    process.exit(1);
}

const notifyTrending = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Fetch TMDB Trending
        console.log('Fetching TMDB Trending...');
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=vi`);
        const trendingItems = tmdbRes.data.results;

        if (!trendingItems || trendingItems.length === 0) {
            console.log('No trending items found.');
            process.exit(0);
        }

        // Pick top 1 movie
        const topMovie = trendingItems[0];
        const title = topMovie.title || topMovie.name;
        const overview = topMovie.overview;

        // 2. Find active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeUsers = await User.find({
            $or: [
                { lastLogin: { $gte: sevenDaysAgo } },
                { updatedAt: { $gte: sevenDaysAgo } }
            ]
        }).select('_id');

        if (activeUsers.length === 0) {
            console.log('No active users to notify.');
            process.exit(0);
        }

        const userIds = activeUsers.map(u => u._id.toString());

        // 3. Send Notification
        console.log(`Sending trending notification about "${title}" to ${userIds.length} users...`);

        await sendToMultiple(userIds, {
            title: '🔥 Phim đang hot hôm nay',
            content: `"${title}" đang dẫn đầu xu hướng! Xem ngay thông tin phim.`,
            link: `https://www.themoviedb.org/movie/${topMovie.id}`, // Link to TMDB for now, or search locally
            type: 'system',
            icon: `https://image.tmdb.org/t/p/w500${topMovie.poster_path}`
        });

        console.log('Trending notifications sent successfully.');
        process.exit(0);

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
};

notifyTrending();
