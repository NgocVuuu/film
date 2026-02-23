const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { syncSpecificMovie } = require('./crawler'); // Use existing crawler helper
const axios = require('axios');
dotenv.config();

const missingDCUMovies = [
    "Man of Steel",
    "Suicide Squad",
    "Wonder Woman",
    "Aquaman",
    "Birds of Prey",
    "Wonder Woman 1984",
    "The Suicide Squad",
    "Shazam! Fury of the Gods",
    "Blue Beetle",
    "Aquaman and the Lost Kingdom"
];

// Reusing multi-source search logic to find accurate slugs
const findBestSlug = async (movieName) => {
    try {
        console.log(`[SEARCH] Querying APIs for "${movieName}"...`);
        const results = await Promise.allSettled([
            axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 }),
            axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 }),
            axios.get(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 })
        ]);

        let bestSlug = null;
        let priority = -1; // Ophim/Kkphim preferred

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const data = result.value.data;
                const items = (index === 2) ? data?.items : (data?.data?.items || data?.items);
                if (!items || !items.length) return;

                // Find exact match on origin_name or name
                const expectedNormalized = movieName.toLowerCase().replace(/[^a-z0-9]/g, '');

                for (const item of items) {
                    const originNorm = (item.origin_name || item.original_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const nameNorm = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (originNorm === expectedNormalized || nameNorm === expectedNormalized || originNorm.includes(expectedNormalized)) {
                        const currentPriority = (index === 0 || index === 1) ? 2 : 1; // Prioritize Ophim/KKPhim
                        if (currentPriority > priority) {
                            bestSlug = item.slug;
                            priority = currentPriority;
                        }
                    }
                }
            }
        });

        return bestSlug;
    } catch (error) {
        console.error(`[SEARCH ERROR] Failed querying for ${movieName}`, error.message);
        return null;
    }
};

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        console.log("Connected DB... Starting DCU Seeder");

        let seededCount = 0;

        for (const title of missingDCUMovies) {
            const slug = await findBestSlug(title);
            if (slug) {
                console.log(`[FOUND SLUG] ${title} -> ${slug}`);
                console.log(`[SYNCING] Injecting ${slug} into database...`);
                // Use the existing sync engine
                const syncRes = await syncSpecificMovie(slug);
                if (syncRes.success) {
                    console.log(`✅ Successfully seeded: ${title}`);
                    seededCount++;
                } else {
                    console.error(`❌ DB Sync failed for ${title}:`, syncRes.message);
                }
            } else {
                console.log(`⚠️ No exact slug found for "${title}" across providers.`);
            }

            // Respect API limits
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`\n\n[DONE] Seeded ${seededCount} / ${missingDCUMovies.length} movies.`);
        process.exit(0);

    } catch (e) {
        console.error("FATAL ERROR", e);
        process.exit(1);
    }
}

seedDB();
