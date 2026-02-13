const mongoose = require('mongoose');
const { syncAll, processPendingRequests } = require('../crawler');
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
        console.log('Connected to MongoDB.');

        console.log('\n========================================');
        console.log('    AUTO CRAWLER + REQUESTS PROCESSOR');
        console.log('========================================\n');

        // Step 1: Run crawler to get latest movies
        console.log('[STEP 1/2] Starting Crawler...');
        const crawlResult = await syncAll({ full: false });
        console.log(`[STEP 1/2] ✓ Crawler completed. Processed ${crawlResult} movies.\n`);

        // Step 2: Process pending user/admin movie requests
        console.log('[STEP 2/2] Processing pending movie requests...');
        const requestResult = await processPendingRequests();
        console.log(`[STEP 2/2] ✓ Requests completed. Successful: ${requestResult.successful}, Failed: ${requestResult.failed}\n`);

        console.log('========================================');
        console.log('Summary:');
        console.log(`- Movies crawled: ${crawlResult}`);
        console.log(`- Requests processed: ${requestResult.processed}`);
        console.log(`  └─ Successful: ${requestResult.successful}`);
        console.log(`  └─ Failed: ${requestResult.failed}`);
        console.log('========================================\n');

        console.log('All tasks finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Crawler/Requests failed:', error);
        process.exit(1);
    }
}

run();
