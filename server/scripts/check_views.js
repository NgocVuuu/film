const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await Movie.countDocuments({ view: { $gt: 0 } });
        console.log(`Movies with views > 0: ${count}`);

        if (count > 0) {
            const top = await Movie.find({ view: { $gt: 0 } })
                .sort({ view: -1 })
                .limit(5)
                .select('name view');
            console.log('Top 5:', top);
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
