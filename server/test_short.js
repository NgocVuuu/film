const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ email: 'ngocvu14.3.2001@gmail.com' });
    const isPrem = u.subscription && u.subscription.tier === 'premium' && u.subscription.status === 'active';
    const isNotExp = !u.subscription?.endDate || new Date(u.subscription.endDate) > new Date();
    console.log(`PREM:${isPrem}|NOTEXP:${isNotExp}|END:${u.subscription.endDate}`);
    await mongoose.disconnect();
}
test();
