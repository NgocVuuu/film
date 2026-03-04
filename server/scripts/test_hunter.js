const mongoose = require('mongoose');
const path = require('path');
const { huntSingleMovie4K } = require('../crawler/hunter');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function testHunt() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Thay slug phim thực tế bạn muốn test vào đây
        const slugToTest = 'minions-su-troi-day-cua-gru'; // Example: 'avengers-endgame'
        console.log(`Testing huntSingleMovie4K for: ${slugToTest}`);

        const result = await huntSingleMovie4K(slugToTest);
        console.log('Result:', JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testHunt();
