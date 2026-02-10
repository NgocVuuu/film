const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config(); // Adjust path if needed

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

const makeAdmin = async () => {
    await connectDB();

    const email = 'vupaul2001@gmail.com';
    try {
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) {
            console.log(`User with email ${email} not found.`);
            console.log("Listing all users to debug:");
            const users = await User.find({}, 'email displayName');
            users.forEach(u => console.log(`- ${u.email} (${u.displayName})`));
        } else {
            user.role = 'admin';
            await user.save();
            console.log(`Successfully updated ${user.email} to admin.`);
        }
    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

makeAdmin();
