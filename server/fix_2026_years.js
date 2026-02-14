const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

const OPHIM_API_DETAIL = 'https://ophim1.com/v1/api/phim';
const KKPHIM_API_DETAIL = 'https://phimapi.com/phim';
const NGUONC_API_DETAIL = 'https://phim.nguonc.com/api/film';

async function fixYears() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB.');

        const movies = await Movie.find({ year: 2026 }).select('name slug thumb_url year').lean();
        console.log(`Found ${movies.length} movies to fix.`);

        let count = 0;
        for (const movie of movies) {
            let correctYear = null;
            let source = '';

            try {
                if (movie.thumb_url.includes('nguonc')) {
                    source = 'NGUONC';
                    const res = await axios.get(`${NGUONC_API_DETAIL}/${movie.slug}`);
                    const data = res.data.movie;
                    if (data) {
                        correctYear = data.year;
                        if (!correctYear && data.category) {
                            const yearGroup = Object.values(data.category).find(g => g.group && g.group.name === 'Năm');
                            if (yearGroup && yearGroup.list && yearGroup.list.length > 0) {
                                correctYear = parseInt(yearGroup.list[0].name);
                            }
                        }
                    }
                } else if (movie.thumb_url.includes('ophim')) {
                    source = 'OPHIM';
                    const res = await axios.get(`${OPHIM_API_DETAIL}/${movie.slug}`);
                    if (res.data.data && res.data.data.item) {
                        correctYear = res.data.data.item.year;
                    }
                } else if (movie.thumb_url.includes('phimapi.com') || movie.thumb_url.includes('kkphim')) {
                    source = 'KKPHIM';
                    const res = await axios.get(`${KKPHIM_API_DETAIL}/${movie.slug}`);
                    if (res.data.movie) {
                        correctYear = res.data.movie.year;
                    }
                }

                if (correctYear && correctYear !== 2026) {
                    await Movie.updateOne({ _id: movie._id }, { year: correctYear });
                    console.log(`[FIXED] ${movie.name} (${source}): 2026 -> ${correctYear}`);
                    count++;
                } else {
                    console.log(`[SKIPPED] ${movie.name} (${source}): Still ${correctYear || 'Unknown'}`);
                }

            } catch (err) {
                console.error(`[ERROR] ${movie.name}: ${err.message}`);
            }

            // Small delay to prevent rate limit
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`\nDone. Fixed ${count} movies.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixYears();
