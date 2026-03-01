require('dotenv').config();
const mongoose = require('mongoose');
const WatchProgress = require('../models/WatchProgress');
const ViewLog = require('../models/ViewLog');

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const progressList = await WatchProgress.find({});
        console.log(`Found ${progressList.length} watch progress entries.`);

        let count = 0;
        for (const p of progressList) {
            // Check if log already exists (idempotency)
            const exists = await ViewLog.findOne({
                userId: p.userId,
                movieSlug: p.movieSlug,
                episodeSlug: p.episodeSlug,
                createdAt: p.lastWatched
            });

            if (!exists) {
                await ViewLog.create({
                    userId: p.userId,
                    movieSlug: p.movieSlug,
                    episodeSlug: p.episodeSlug,
                    createdAt: p.lastWatched // Preserve historical timestamp
                });
                count++;
            }
        }

        console.log(`Migrated ${count} entries to ViewLog.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
