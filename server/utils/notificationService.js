const webPush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@pchill.online',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send notification to a user (DB + Web Push)
 * @param {string} userId - Target user ID
 * @param {Object} data - Notification data
 * @param {string} data.content - Notification text
 * @param {string} data.link - Redirect link
 * @param {string} data.type - Notification type
 * @param {string} [data.title] - Push notification title (optional)
 * @param {string} [data.icon] - Push notification icon (optional)
 */
async function sendNotification(userId, data) {
    try {
        // 1. Create DB Notification
        await Notification.create({
            recipient: userId,
            content: data.content,
            link: data.link || '/',
            type: data.type || 'system'
        });

        // 2. Send Web Push if VAPID is configured
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            const subscriptions = await PushSubscription.find({ userId });

            if (subscriptions.length > 0) {
                const payload = JSON.stringify({
                    title: data.title || 'Pchill',
                    body: data.content,
                    link: data.link || '/',
                    icon: data.icon || '/logo.png',
                    badge: '/logo.png',
                    timestamp: Date.now()
                });

                const results = await Promise.allSettled(
                    subscriptions.map(sub =>
                        webPush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.keys.p256dh,
                                auth: sub.keys.auth
                            }
                        }, payload)
                    )
                );

                // Cleanup failed subscriptions
                const failedEndpoints = [];
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        // Error code 410 (Gone) or 404 means subscription is no longer valid
                        if (result.reason.statusCode === 410 || result.reason.statusCode === 404) {
                            failedEndpoints.push(subscriptions[index].endpoint);
                        }
                    }
                });

                if (failedEndpoints.length > 0) {
                    await PushSubscription.deleteMany({ endpoint: { $in: failedEndpoints } });
                }
            }
        }
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error.message);
    }
}

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} data - Notification data
 */
async function sendToMultiple(userIds, data) {
    // Basic implementation: loop and send
    // For very large numbers, we might want to batch DB inserts or use chunked push
    for (const userId of userIds) {
        await sendNotification(userId, data);
    }
}

module.exports = {
    sendNotification,
    sendToMultiple
};
