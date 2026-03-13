const mongoose = require('mongoose');
const Comment = require('../models/Comment');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/film');
        console.log('Connected to MongoDB');

        // 1. Update comments with ratings to type 'rating'
        const ratingResult = await Comment.updateMany(
            { rating: { $gt: 0 } },
            { $set: { type: 'rating' } }
        );
        console.log(`Updated ${ratingResult.modifiedCount} documents to type 'rating'`);

        // 2. Update comments without ratings to type 'comment'
        const commentResult = await Comment.updateMany(
            { $or: [{ rating: { $exists: false } }, { rating: null }, { rating: 0 }] },
            { $set: { type: 'comment' } }
        );
        console.log(`Updated ${commentResult.modifiedCount} documents to type 'comment'`);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
