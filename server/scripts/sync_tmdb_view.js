const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    console.error('Lỗi: Chưa cấu hình TMDB_API_KEY trong file .env');
    console.log('Vui lòng thêm dòng này vào .env: TMDB_API_KEY=your_api_key_here');
    process.exit(1);
}

const syncTMDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Fetch TMDB Trending (All, Day)
        console.log('Fetching TMDB Trending...');
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`);
        const trendingItems = tmdbRes.data.results;

        console.log(`Found ${trendingItems.length} trending items from TMDB.`);

        let updatedCount = 0;

        for (const item of trendingItems) {
            const originalTitle = item.original_title || item.original_name;
            const popularity = item.popularity;

            if (!originalTitle) continue;

            // 2. Find in Local DB (Match exact origin_name or name)
            // Using regex for case-insensitive match
            const movie = await Movie.findOne({
                $or: [
                    { origin_name: { $regex: new RegExp(`^${originalTitle}$`, 'i') } },
                    { name: { $regex: new RegExp(`^${item.title || item.name}$`, 'i') } }
                ]
            });

            if (movie) {
                // 3. Update View
                // TMDB popularity is usually 100-5000+. We multiply to make it look like "views".
                // Example: Pop 2500 -> 250,000 views
                const newView = Math.floor(popularity * 100);

                movie.view = newView;
                await movie.save();
                console.log(`[MATCH] ${movie.name} (${originalTitle}) -> Updated View: ${newView}`);
                updatedCount++;
            } else {
                console.log(`[MISS] ${originalTitle} not found in local DB.`);
            }
        }

        console.log(`\nSync Completed. Updated ${updatedCount} movies based on TMDB.`);
        process.exit(0);

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
};

syncTMDB();
