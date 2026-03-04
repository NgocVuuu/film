const mongoose = require('mongoose');
const { run4KHunterBot } = require('../crawler/hunter');
require('dotenv').config({ path: '../.env' });

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
        console.log('      🕷️ 4K SPIDER BOT (HUNTER)');
        console.log('========================================\n');

        const result = await run4KHunterBot();

        console.log('\n========================================');
        console.log('Summary:');
        console.log(`- Processed: ${result.processed}`);
        console.log(`- Added to Draft: ${result.added}`);
        console.log('========================================\n');

        console.log('Hunter finished.');
        process.exit(0);
    } catch (error) {
        console.error('Hunter failed:', error);
        process.exit(1);
    }
}

run();
