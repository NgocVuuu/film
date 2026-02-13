const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const PushSubscription = require('./models/PushSubscription');

async function checkSubscriptions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ email: 'ngocvu14.3.2001@gmail.com' });
        if (!user) {
            console.log('User not found');
            return;
        }

        const subscriptions = await PushSubscription.find({ userId: user._id });
        console.log(`User: ${user.displayName} (${user.email})`);
        console.log(`Found ${subscriptions.length} push subscriptions:`);

        subscriptions.forEach((sub, i) => {
            console.log(`\nSub ${i + 1}:`);
            console.log(`- Endpoint: ${sub.endpoint.substring(0, 50)}...`);
            console.log(`- User Agent: ${sub.userAgent}`);
            console.log(`- Created At: ${sub.createdAt}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSubscriptions();
