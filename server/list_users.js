const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function listAllUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const users = await User.find({}).sort({ createdAt: -1 }).limit(20);
        console.log(`Last 20 registered users:\n`);

        users.forEach((u, i) => {
            console.log(`${i + 1}. Name: ${u.displayName} | Email: ${u.email} | Tier: ${u.subscription.tier} | Role: ${u.role} | Joined: ${u.createdAt}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listAllUsers();
