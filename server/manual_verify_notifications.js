const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Notification = require('./models/Notification');
const { sendNotification } = require('./utils/notificationService');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Get any user
        const user = await User.findOne();
        if (!user) {
            console.log('No user found to test with.');
            process.exit(0);
        }

        console.log(`Testing notifications for user: ${user.displayName} (${user._id})`);

        // Test sending a notification
        await sendNotification(user._id, {
            title: '🚀 Test Notification',
            content: 'Đây là thông báo kiểm tra tính năng mới.',
            link: '/phim-moi',
            type: 'system'
        });

        // Verify DB entry
        const latestNotif = await Notification.findOne({ recipient: user._id }).sort({ createdAt: -1 });
        if (latestNotif && latestNotif.content.includes('kiểm tra')) {
            console.log('✓ Database notification created successfully.');
        } else {
            console.log('✗ Failed to find notification in database.');
        }

        console.log('\nWeb Push depends on valid VAPID keys and browser subscription.');
        console.log('Check server logs for any push errors.');

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

verify();
