const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const movies = await Movie.find({ $or: [{ view: 0 }, { view: { $exists: false } }] });
        console.log(`Found ${movies.length} movies to seed views.`);

        let updated = 0;
        for (const movie of movies) {
            // Random base: 500 - 5000 views
            let views = Math.floor(Math.random() * 4500) + 500;

            // Year bonus: Newer = Higher views (simulate current interest)
            if (movie.year) {
                if (movie.year >= 2025) views += 8000;
                else if (movie.year >= 2024) views += 5000;
                else if (movie.year >= 2022) views += 2000;
            }

            // Type bonus: Series/Cinema often have higher views
            if (movie.type === 'series' || movie.chieurap) views += 1500;

            movie.view = views;
            await movie.save();
            updated++;

            if (updated % 50 === 0) process.stdout.write(`.`);
        }

        console.log(`\nSuccessfully seeded views for ${updated} movies.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
