const mongoose = require('mongoose');
const Movie = require('../models/Movie');

require('dotenv').config({ path: __dirname + '/../.env' });

async function syncHasVip() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const movies = await Movie.find({});
        let updatedCount = 0;

        for (const movie of movies) {
            let hasVip = false;
            if (movie.episodes && movie.episodes.length > 0) {
                hasVip = movie.episodes.some(server => {
                    const sName = server.server_name ? server.server_name.toLowerCase() : '';
                    return sName.includes('play4me') || sName.includes('seekstreaming') || sName.includes('vip');
                });
            }

            if (movie.hasVip !== hasVip) {
                movie.hasVip = hasVip;
                // Use updateOne to bypass .save() overhead if we just want to flip a boolean
                await Movie.updateOne({ _id: movie._id }, { $set: { hasVip: hasVip } });
                updatedCount++;
                console.log(`Updated ${movie.name} (${movie.slug}) -> hasVip: ${hasVip}`);
            }
        }

        console.log(`Sync complete. Updated ${updatedCount} movies.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

syncHasVip();
