const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        console.log('\n--- Checking Sci-Fi (Viễn Tưởng) List Content ---');
        // Matches the query in movieController.js
        const movies = await Movie.find({
            'category.slug': 'vien-tuong',
            type: { $nin: ['hoathinh', 'tvshows'] },
            isActive: { $ne: false }
        })
            .sort({ year: -1, updatedAt: -1 })
            .limit(10)
            .select('name original_name type category country slug');

        if (movies.length === 0) {
            console.log('No movies found in Sci-Fi list with current filters.');
        } else {
            movies.forEach(m => {
                const cats = m.category.map(c => c.name).join(', ');
                console.log(`[${m.type}] ${m.name} (${m.original_name}) | Cats: ${cats}`);
            });
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
