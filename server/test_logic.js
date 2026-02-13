const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function testMiddlewareLogic() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ email: 'ngocvu14.3.2001@gmail.com' });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User Data:', JSON.stringify(user.subscription, null, 2));

        // THE LOGIC FROM premiumMiddleware
        const isPremium = user.subscription &&
            user.subscription.tier === 'premium' &&
            user.subscription.status === 'active';

        const isNotExpired = !user.subscription?.endDate ||
            new Date(user.subscription.endDate) > new Date();

        console.log('\n--- EVALUATION ---');
        console.log('isPremium:', isPremium);
        console.log('isNotExpired:', isNotExpired);
        console.log('Final Result (isPremium && isNotExpired):', isPremium && isNotExpired);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testMiddlewareLogic();
