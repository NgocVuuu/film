const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

async function testSubmit() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const Feedback = mongoose.model('Feedback', new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            title: String,
            content: String,
            type: String,
            status: String
        }, { timestamps: true }));

        const feedback = await Feedback.create({
            title: 'Test Feedback from Script',
            content: 'This is a test content',
            type: 'other',
            status: 'pending'
        });

        console.log('Feedback created:', feedback);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSubmit();
