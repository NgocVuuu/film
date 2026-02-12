const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5);

        let output = '--- Recent Users ---\n';
        recentUsers.forEach(u => {
            output += `ID: ${u._id}\n`;
            output += `Email: ${u.email}\n`;
            output += `Verified: ${u.isVerified}\n`;
            output += `Created: ${u.createdAt}\n`;
            output += `Token: ${u.verificationToken}\n`;
            output += '-------------------\n';
        });

        fs.writeFileSync('user_dump.txt', output);
        console.log('Dumped to user_dump.txt');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
