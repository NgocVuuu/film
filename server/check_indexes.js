const mongoose = require('mongoose');
require('dotenv').config();

async function checkIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        console.log('Connected to MongoDB');
        const Movie = require('./models/Movie');
        const indexes = await Movie.collection.getIndexes();
        console.log('Movie Collection Indexes:', JSON.stringify(indexes, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkIndexes();
