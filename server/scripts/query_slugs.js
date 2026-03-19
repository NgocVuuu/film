require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const MovieList = require('../models/MovieList');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
    // Tìm MovieList liên quan đến sad/buon
    const lists = await MovieList.find({ name: /buồn|sad|tâm lý|cảm động/i }).select('slug name movies').lean();
    console.log('\n=== MOVIE LISTS (sad/buon) ===');
    for (const l of lists) {
        console.log('List:', l.slug, '|', l.name);
        const slugs = (l.movies || []).slice(0, 15);
        if (slugs.length) {
            const ms = await Movie.find({ _id: { $in: slugs } }).select('slug name year').lean();
            ms.forEach(m => console.log('  ', m.slug, '|', m.name, '|', m.year));
        }
    }

    // Phim tâm lý hàn đặc biệt nổi tiếng (bất kể năm)
    const sadKr = await Movie.find({
        'country.name': /hàn quốc/i,
        'category.name': /tâm lý|romance|tình cảm/i,
        year: { $lte: 2023 }
    }).select('slug name year status').sort({ year: -1 }).limit(15).lean();
    console.log('\n=== HÀN DRAMA/TÂM LÝ (cũ-nổi tiếng) ===');
    sadKr.forEach(m => console.log(m.slug + ' | ' + m.name + ' | ' + m.year));

    mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
