const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: './.env' });
const Movie = require('./models/Movie');

const NGUONC_API_DETAIL = 'https://phim.nguonc.com/api/film';

async function fixTayDuKy() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB.');

        const movies = await Movie.find({ slug: /tay-du-ky/i, year: 2026 }).select('name slug thumb_url year').lean();
        console.log(`Found ${movies.length} Tây Du Ký movies to fix immediately.`);

        for (const movie of movies) {
            try {
                if (movie.thumb_url.includes('nguonc')) {
                    const res = await axios.get(`${NGUONC_API_DETAIL}/${movie.slug}`);
                    const data = res.data.movie;
                    if (data) {
                        let correctYear = data.year;
                        if (!correctYear && data.category) {
                            const yearGroup = Object.values(data.category).find(g => g.group && g.group.name === 'Năm');
                            if (yearGroup && yearGroup.list && yearGroup.list.length > 0) {
                                correctYear = parseInt(yearGroup.list[0].name);
                            }
                        }

                        if (correctYear && correctYear !== 2026) {
                            await Movie.updateOne({ _id: movie._id }, { year: correctYear });
                            console.log(`[FIXED] ${movie.name}: 2026 -> ${correctYear}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`[ERROR] ${movie.name}: ${err.message}`);
            }
        }

        console.log('Immediate fix for Tây Du Ký completed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixTayDuKy();
