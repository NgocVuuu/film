const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function debugSubscription() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        console.log('Current Server Time:', now.toISOString());
        console.log('Current Server Time (Local):', now.toString());

        const users = await User.find({
            'subscription.tier': 'premium'
        }).select('displayName email subscription');

        users.forEach(user => {
            const endDate = user.subscription.endDate;
            console.log(`\nUser: ${user.displayName} (${user.email})`);
            console.log(`Tier: ${user.subscription.tier}, Status: ${user.subscription.status}`);
            console.log(`End Date (Raw):`, endDate);
            if (endDate) {
                console.log(`End Date (ISO):`, endDate.toISOString());
                console.log(`Is Expired?`, endDate < now ? 'YES' : 'NO');
                console.log(`Difference (ms):`, endDate - now);
            } else {
                console.log('End Date is MISSING');
            }
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugSubscription();
