
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Movie = require('../models/Movie');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Migrate Comments
        console.log('Migrating comments...');
        const comments = await Comment.find({ rating: { $exists: true, $ne: null } });
        let commentCount = 0;

        for (const comment of comments) {
            const oldRating = comment.rating;
            const newRating = Math.max(1, Math.floor(oldRating / 2));
            
            if (oldRating !== newRating) {
                comment.rating = newRating;
                await comment.save();
                commentCount++;
            }
        }
        console.log(`Migrated ${commentCount} comments to 5-star scale.`);

        // 2. Recalculate Movie Averages - OPTIMIZED
        console.log('Recalculating movie averages (Optimized)...');
        
        // Find all slugs that have rated comments
        const ratedSlugs = await Comment.distinct('movieSlug', { rating: { $exists: true, $ne: null } });
        console.log(`Found ${ratedSlugs.length} movies with rated comments.`);

        let movieCount = 0;

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
                    { 
                        $set: { 
                            rating_average: newAvg, 
                            rating_count: newCount 
                        } 
                    }
                );
                movieCount++;
            }
        }
        
        // Reset movies that have no ratings but might have had them before
        const resetResult = await Movie.updateMany(
            { slug: { $nin: ratedSlugs }, rating_count: { $gt: 0 } },
            { $set: { rating_average: 0, rating_count: 0 } }
        );

        console.log(`Updated ${movieCount} movies with new rating stats.`);
        console.log(`Reset ${resetResult.modifiedCount} movies with no ratings.`);

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
