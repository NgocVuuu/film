const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const verifyUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const emailsToVerify = ['ngocvu14.3.2001@gmail.com', 'vupaul2001@gmail.com'];

        const result = await User.updateMany(
            { email: { $in: emailsToVerify } },
            { $set: { isVerified: true, verificationToken: undefined, verificationTokenExpire: undefined } }
        );

        console.log('Update Result:', result);
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyUsers();
