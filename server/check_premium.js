const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function checkPremiumUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const allPremiumOrAdmin = await User.find({
            $or: [
                { 'subscription.tier': 'premium' },
                { 'role': 'admin' }
            ]
        }).select('displayName email subscription role createdAt');

        console.log('\n--- PREMIUM & ADMIN USERS LIST ---');
        if (allPremiumOrAdmin.length === 0) {
            console.log('No premium or admin users found.');
        } else {
            console.log(`Found ${allPremiumOrAdmin.length} users:\n`);
            allPremiumOrAdmin.forEach((user, index) => {
                const endDate = user.subscription.endDate ? new Date(user.subscription.endDate).toLocaleDateString() : 'N/A';
                const isPremium = user.subscription.tier === 'premium' ? 'YES' : 'NO';
                console.log(`${index + 1}. Name: ${user.displayName}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Is Premium: ${isPremium}`);
                console.log(`   Subscription Status: ${user.subscription.status}`);
                console.log(`   End Date: ${endDate}`);
                console.log(`   Joined: ${new Date(user.createdAt).toLocaleDateString()}`);
                console.log('---------------------------');
            });
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPremiumUsers();
