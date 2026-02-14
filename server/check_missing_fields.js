const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

async function checkMissingFields() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const total = await Movie.countDocuments({});
        const hasTrue = await Movie.countDocuments({ isActive: true });
        const hasFalse = await Movie.countDocuments({ isActive: false });
        const isMissing = await Movie.countDocuments({ isActive: { $exists: false } });
        const neFalse = await Movie.countDocuments({ isActive: { $ne: false } });

        console.log('Total movies:', total);
        console.log('isActive is true:', hasTrue);
        console.log('isActive is false:', hasFalse);
        console.log('isActive is missing:', isMissing);
        console.log('isActive is not false ($ne: false):', neFalse);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMissingFields();
