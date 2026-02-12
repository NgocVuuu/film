const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5);

        console.log('--- Recent Users ---');
        recentUsers.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Email: ${u.email}`);
            console.log(`Verified: ${u.isVerified}`);
            console.log(`Created: ${u.createdAt}`);
            console.log('-------------------');
        });

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
