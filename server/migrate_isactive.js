const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

async function migrateIsActive() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await Movie.updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );

        console.log(`Updated ${result.modifiedCount} movies to have isActive: true`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

migrateIsActive();
