const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

async function checkFeedback() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const Feedback = mongoose.model('Feedback', new mongoose.Schema({}, { strict: false }));
        const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(5);

        console.log(`Total feedbacks: ${await Feedback.countDocuments()}`);
        console.log('Latest 5 feedbacks:');
        console.log(JSON.stringify(feedbacks, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkFeedback();
