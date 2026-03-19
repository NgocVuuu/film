const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Movie = require('../models/Movie');
require('dotenv').config();

async function recover() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('Recovering ratings...');
        
        // Use two separate updates to be safer with older drivers/servers
        const res2 = await Comment.updateMany(
            { type: 'rating', rating: 2 },
            { $set: { rating: 5 } }
        );
        console.log(`Updated ${res2.modifiedCount} documents from 2 stars to 5 stars (Premium feel).`);

        const res1 = await Comment.updateMany(
            { type: 'rating', rating: 1 },
            { $set: { rating: 4 } }
        );
        console.log(`Updated ${res1.modifiedCount} documents from 1 star to 4 stars (Good feel).`);

        // 2. Recalculate Movie Averages
        console.log('Recalculating movie averages...');
        const ratedSlugs = await Comment.distinct('movieSlug', { rating: { $exists: true, $ne: null } });
        
        for (const slug of ratedSlugs) {
            const stats = await Comment.aggregate([
                { $match: { movieSlug: slug, rating: { $exists: true, $ne: null } } },
                {
                    $group: {
                        _id: '$movieSlug',
                        avgRating: { $avg: '$rating' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            if (stats.length > 0) {
                const newAvg = Math.round(stats[0].avgRating * 10) / 10;
                const newCount = stats[0].count;

                await Movie.updateOne(
                    { slug: slug },
                    { $set: { rating_average: newAvg, rating_count: newCount } }
                );
            }
        }
        console.log(`Recalculated stats for ${ratedSlugs.length} movies.`);

        process.exit(0);
    } catch (err) {
        console.error('Recovery failed:', err);
        process.exit(1);
    }
}
recover();
