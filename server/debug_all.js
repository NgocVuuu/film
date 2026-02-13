const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const PushSubscription = require('./models/PushSubscription');

async function debugAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const users = await User.find({ email: /ngocvu/i });
        console.log(`Found ${users.length} users with "ngocvu" in email:\n`);

        for (const u of users) {
            console.log(`User: ${u.displayName} | Email: ${u.email} | Role: ${u.role} | Tier: ${u.subscription.tier}`);
            const subs = await PushSubscription.find({ userId: u._id });
            console.log(`- Subscriptions: ${subs.length}`);
            subs.forEach(s => console.log(`  * UA: ${s.userAgent.substring(0, 50)}...`));
            console.log('---------------------------');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugAll();
