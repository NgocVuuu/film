const mongoose = require('mongoose');
const { syncAll } = require('../crawler');
require('dotenv').config({ path: '../.env' }); // Load .env from server directory

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI is missing in environment variables.');
    process.exit(1);
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected. Starting Crawler...');

        // Run full sync (or partial depending on args)
        // Default to partial update for frequent runs
        await syncAll({ full: false });

        console.log('Crawler finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Crawler failed:', error);
        process.exit(1);
    }
}

run();
