const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

async function checkYears() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const count2026 = await Movie.countDocuments({ year: 2026 });
        console.log(`\nFound ${count2026} movies with year 2026.`);

        if (count2026 > 0) {
            const sample = await Movie.find({ year: 2026 })
                .limit(20)
                .select('name origin_name slug year updatedAt')
                .lean();

            console.log('\nSample of movies with year 2026:');
            sample.forEach(m => {
                console.log(`- ${m.name} (${m.origin_name}) [${m.slug}] -> Year: ${m.year}, Updated: ${m.updatedAt}`);
            });
        }

        // Check for "Ac mong pho Elm" specifically
        const elm = await Movie.findOne({ slug: /ac-mong-pho-elm/i }).lean();
        if (elm) {
            console.log('\nSpecific check for "Ac mong pho Elm":');
            console.log(JSON.stringify(elm, null, 2));
        } else {
            console.log('\n"Ac mong pho Elm" not found by slug regex /ac-mong-pho-elm/i');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkYears();
