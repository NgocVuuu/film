const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Movie = require('./models/Movie');
const fs = require('fs');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill').then(async () => {

    // Check "Cô gái dễ thương quyết chiến" (The Girl with Super Ability)
    const q1 = await Movie.findOne({ origin_name: /The Girl with Super Ability/i }).select('name origin_name actor slug year').lean();

    // Check "Lục Vân Tiên Tuyệt Đỉnh Kungfu"
    const q2 = await Movie.findOne({ slug: /luc-van-tien/i }).select('name origin_name actor slug year').lean();

    // Check "Đường Bá Hổ Điểm Thu Hương 2019"
    const q3 = await Movie.findOne({ name: /Đường Bá Hổ/i, year: 2019 }).select('name origin_name actor year slug').lean();

    fs.writeFileSync('testResult.json', JSON.stringify({ q1, q2, q3 }, null, 2), 'utf-8');
    process.exit(0);
});
