const mongoose = require('mongoose');
require('dotenv').config();

async function investigate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        console.log('Connected to MongoDB');
        const Movie = require('./models/Movie');

        // 1. Check all movies and their isActive status
        const allMovies = await Movie.find({}).limit(5).select('name slug isActive');
        console.log('Sample movies:', JSON.stringify(allMovies, null, 2));

        const inactiveCount = await Movie.countDocuments({ isActive: false });
        const activeCount = await Movie.countDocuments({ isActive: true });
        console.log(`Counts: Active=${activeCount}, Inactive=${inactiveCount}`);

        // 2. Simulate what the API does for getting movies
        // The controller does: if (isActive !== undefined) query.isActive = isActive === 'true';
        // If isActive is undefined, it finds all.
        const apiSimulationQuery = {};
        const results = await Movie.find(apiSimulationQuery).limit(5).select('name slug isActive');
        console.log('API Simulation (no isActive param):', JSON.stringify(results, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

investigate();
