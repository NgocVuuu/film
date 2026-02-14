const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

async function listAll2026() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const movies = await Movie.find({ year: 2026 })
            .select('name origin_name slug thumb_url updatedAt')
            .lean();

        console.log(`\nTotal movies with year 2026: ${movies.length}`);

        const counts = { NGUONC: 0, OPHIM: 0, KKPHIM: 0, OTHER: 0 };

        movies.forEach(m => {
            let source = 'OTHER';
            if (m.thumb_url.includes('nguonc')) source = 'NGUONC';
            else if (m.thumb_url.includes('ophim')) source = 'OPHIM';
            else if (m.thumb_url.includes('phimapi.com') || m.thumb_url.includes('kkphim')) source = 'KKPHIM';

            counts[source]++;
            if (counts[source] <= 10) {
                console.log(`- [${source}] ${m.name} (${m.origin_name}) [${m.slug}]`);
            }
        });

        console.log('\nSummary by source:', counts);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listAll2026();
