const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

async function validateProgress() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const count2026 = await Movie.countDocuments({ year: 2026 });

        const lastUpdated = await Movie.find({ thumb_url: /nguonc/ })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('name slug year updatedAt')
            .lean();

        console.log('\n--- Status Check ---');
        console.log('Remaining 2026 movies:', count2026);
        console.log('\nLast 10 NGUONC movies processed/updated:');
        lastUpdated.forEach(m => {
            console.log(`- ${m.name} [${m.slug}] -> Year: ${m.year}, Updated: ${m.updatedAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

validateProgress();
