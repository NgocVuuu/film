const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

const NGUONC_API_DETAIL = 'https://phim.nguonc.com/api/film';

async function fixAllNguonCYears() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB.');

        // Find ALL movies that belong to NGUONC
        const movies = await Movie.find({ thumb_url: /nguonc/ }).select('name slug year').lean();
        console.log(`Starting broad repair for ${movies.length} NGUONC movies with rate-limit protection...`);

        let fixedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let rateLimitCount = 0;

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            const progress = `[${i + 1}/${movies.length}]`;

            let retry = true;
            let retryWait = 30000; // Start with 30s wait on 429

            while (retry) {
                try {
                    const res = await axios.get(`${NGUONC_API_DETAIL}/${movie.slug}`, { timeout: 15000 });
                    const data = res.data.movie;

                    if (data) {
                        let correctYear = data.year;
                        if (!correctYear && data.category) {
                            const yearGroup = Object.values(data.category).find(g => g.group && g.group.name === 'Năm');
                            if (yearGroup && yearGroup.list && yearGroup.list.length > 0) {
                                correctYear = parseInt(yearGroup.list[0].name);
                            }
                        }

                        if (correctYear && correctYear !== movie.year) {
                            await Movie.updateOne({ _id: movie._id }, { year: correctYear });
                            console.log(`${progress} [FIXED] ${movie.name}: ${movie.year} -> ${correctYear}`);
                            fixedCount++;
                        } else {
                            skippedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                    retry = false; // Success, move to next movie

                } catch (err) {
                    if (err.response && err.response.status === 429) {
                        rateLimitCount++;
                        console.log(`\n${progress} [RATE LIMIT] Hitting 429. Waiting ${retryWait / 1000}s before retry...\n`);
                        await new Promise(r => setTimeout(r, retryWait));
                        retryWait *= 2; // Exponential backoff for retries
                        if (retryWait > 300000) retryWait = 300000; // Max 5 mins wait
                    } else {
                        console.error(`${progress} [ERROR] ${movie.name}: ${err.message}`);
                        errorCount++;
                        retry = false; // Skip on other errors
                    }
                }
            }

            // Standard delay between successful requests: 800ms
            await new Promise(r => setTimeout(r, 800));
        }

        console.log('\n--- Broad Repair Complete ---');
        console.log(`Fixed: ${fixedCount}`);
        console.log(`Skipped/Correct: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Rate limits encountered: ${rateLimitCount}`);

        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

fixAllNguonCYears();
