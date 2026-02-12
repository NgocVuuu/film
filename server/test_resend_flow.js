const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:5000/api/auth';

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Create temporary user
        const testEmail = `test_resend_${Date.now()}@example.com`;
        await User.deleteOne({ email: testEmail }); // Cleanup just in case

        const user = await User.create({
            displayName: 'Test User',
            email: testEmail,
            password: 'password123',
            role: 'user',
            isVerified: false
        });
        console.log(`Created test user: ${testEmail}`);

        // 2. Call Resend API
        console.log('Calling Resend API...');
        try {
            const response = await axios.post(`${API_URL}/resend-verification`, {
                email: testEmail
            });
            console.log('API Response:', response.data);
        } catch (error) {
            console.error('API Error:', error.response?.data || error.message);
        }

        // 3. Verify Token Update
        const updatedUser = await User.findById(user._id);
        console.log(`Verification Token present: ${!!updatedUser.verificationToken}`);
        console.log(`Token Value: ${updatedUser.verificationToken}`);

        // 4. Cleanup
        await User.deleteOne({ _id: user._id });
        console.log('Cleaned up test user');

        process.exit();
    } catch (error) {
        console.error('System Error:', error);
        process.exit(1);
    }
};

runTest();
