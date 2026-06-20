const mongoose = require('mongoose');
const Movie = require('../models/Movie');

require('dotenv').config({ path: __dirname + '/../.env' });

async function syncLang() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const movies = await Movie.find({});
        let updatedCount = 0;

        for (const movie of movies) {
            let availableLangs = new Set();
            const originalLang = (movie.lang || '').toLowerCase();
            if (originalLang.includes('vietsub')) availableLangs.add('Vietsub');
            if (originalLang.includes('thuyết minh')) availableLangs.add('Thuyết Minh');
            if (originalLang.includes('lồng tiếng')) availableLangs.add('Lồng Tiếng');

            if (movie.episodes) {
                movie.episodes.forEach(ep => {
                    const sn = (ep.server_name || '').toLowerCase();
                    if (sn.includes('vietsub')) availableLangs.add('Vietsub');
                    if (sn.includes('thuyết minh')) availableLangs.add('Thuyết Minh');
                    if (sn.includes('lồng tiếng')) availableLangs.add('Lồng Tiếng');
                });
            }

            let newLangStr = Array.from(availableLangs).join(' + ');
            // Phân loại default nếu không có gì
            if (!newLangStr) newLangStr = movie.lang;

            if (movie.lang !== newLangStr && newLangStr !== "") {
                const oldLang = movie.lang;
                movie.lang = newLangStr;
                await Movie.updateOne({ _id: movie._id }, { $set: { lang: newLangStr } });
                updatedCount++;
                console.log(`Updated ${movie.name} (${movie.slug}) -> lang: '${oldLang}' => '${newLangStr}'`);
            }
        }

        console.log(`Sync complete. Updated ${updatedCount} movies.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

syncLang();
