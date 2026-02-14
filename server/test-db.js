const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

async function run() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('MONGO_URI is not defined in .env');
            process.exit(1);
        }

        console.log('Connecting to database...');
        await mongoose.connect(uri);

        const movieCount = await Movie.countDocuments();
        console.log('Total movies:', movieCount);

        const cats = await Movie.aggregate([
            { $unwind: '$category' },
            { $group: { _id: '$category.slug', name: { $first: '$category.name' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const countries = await Movie.aggregate([
            { $unwind: '$country' },
            { $group: { _id: '$country.slug', name: { $first: '$country.name' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const types = await Movie.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        console.log(JSON.stringify({ cats, countries, types }, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
