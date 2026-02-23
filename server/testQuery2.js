const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Movie = require('./models/Movie');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill').then(async () => {

    // Check if we have the 1993 "Flirting Scholar"
    const q1 = await Movie.find({ year: 1993, $or: [{ name: /Đường Bá Hổ/i }, { origin_name: /Flirting Scholar/i }] }).select('name year slug').lean();
    console.log("1993 Flirting Scholar:", q1);

    // Check "Tuyệt đỉnh Kungfu" 2004
    const q2 = await Movie.find({ year: 2004, name: /Tuyệt đỉnh Kungfu/i }).select('name year slug').lean();
    console.log("2004 Kungfu Hustle:", q2);

    // Check "Quyết Chiến Giang Hồ" 1989
    const q3 = await Movie.find({ year: 1989, name: /Quyết Chiến Giang Hồ/i }).select('name year slug').lean();
    console.log("1989 Dragon Fight:", q3);

    process.exit(0);
});
