const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

async function debugOtherSources() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const movies = await Movie.find({ year: 2026 })
            .select('name origin_name slug thumb_url updatedAt')
            .lean();

        console.log(`\nTotal movies with year 2026: ${movies.length}`);

        const otherSamples = movies.filter(m => {
            const isNguonc = m.thumb_url.includes('nguonc');
            const isOphim = m.thumb_url.includes('ophim');
            const isKkphim = m.thumb_url.includes('phimapi.com') || m.thumb_url.includes('kkphim');
            return !isNguonc && !isOphim && !isKkphim;
        });

        console.log(`\nFound ${otherSamples.length} movies with unknown sources.`);
        otherSamples.slice(0, 20).forEach(m => {
            console.log(`- ${m.name} [${m.slug}] -> thumb: ${m.thumb_url}`);
        });

        const ophimSample = movies.filter(m => m.thumb_url.includes('ophim'));
        console.log(`\nFound ${ophimSample.length} movies from OPHIM.`);
        ophimSample.slice(0, 5).forEach(m => {
            console.log(`- ${m.name} [${m.slug}] -> thumb: ${m.thumb_url}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugOtherSources();
