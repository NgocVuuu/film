const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@pchill.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Get VAPID public key (public endpoint)
exports.getVapidPublicKey = async (req, res) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VAPID keys not configured on server'
      });
    }

    res.json({
      success: true,
      data: process.env.VAPID_PUBLIC_KEY
    });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy VAPID public key'
    });
  }
};

// Subscribe to push notifications (premium only)
exports.subscribe = async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    const userId = req.user._id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription data không hợp lệ'
      });
    }

    // Check if subscription already exists
    const existingSubscription = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existingSubscription) {
      // Update userId if different (user logged in on different account)
      if (existingSubscription.userId.toString() !== userId.toString()) {
        existingSubscription.userId = userId;
        existingSubscription.userAgent = userAgent || '';
        await existingSubscription.save();
      }

      return res.json({
        success: true,
        message: 'Subscription đã tồn tại',
        data: existingSubscription
      });
    }

    // Create new subscription
    const pushSubscription = await PushSubscription.create({
      userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      userAgent: userAgent || ''
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký push notification thành công',
      data: pushSubscription
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng ký push notification'
    });
  }
};

// Unsubscribe from push notifications
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint không hợp lệ'
      });
    }

    // Delete subscription
    const result = await PushSubscription.deleteOne({
      userId,
      endpoint
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Hủy đăng ký push notification thành công'
    });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đăng ký push notification'
    });
  }
};

// Send push notification to specific user (admin only)
exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, body, url, icon } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, title và body là bắt buộc'
      });
    }

    // Get all subscriptions for user
    const subscriptions = await PushSubscription.getByUserId(userId);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User không có subscription nào'
      });
    }

    // Send to all subscriptions
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      url: url || '/',
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

    // Remove failed subscriptions (expired/invalid)
    const failedIndices = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedIndices.push(index);
      }
    });

    if (failedIndices.length > 0) {
      const failedEndpoints = failedIndices.map(i => subscriptions[i].endpoint);
      await PushSubscription.deleteMany({
        endpoint: { $in: failedEndpoints }
      });
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    res.json({
      success: true,
      message: `Đã gửi push notification thành công đến ${successCount}/${subscriptions.length} thiết bị`,
      data: {
        total: subscriptions.length,
        success: successCount,
        failed: failedIndices.length
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi push notification'
    });
  }
};

// Send push notification to all premium users (admin only)
exports.sendToAllPremium = async (req, res) => {
  try {
    const { title, body, url, icon } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'title và body là bắt buộc'
      });
    }

    // Get all premium users
    const premiumUsers = await User.find({
      'subscription.tier': 'premium',
      'subscription.status': 'active'
    }).select('_id');

    const premiumUserIds = premiumUsers.map(u => u._id);

    // Get all subscriptions for premium users
    const subscriptions = await PushSubscription.find({
      userId: { $in: premiumUserIds }
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không có premium user nào có subscription'
      });
    }

    // Send to all subscriptions
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      url: url || '/',
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

    // Remove failed subscriptions
    const failedIndices = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedIndices.push(index);
      }
    });

    if (failedIndices.length > 0) {
      const failedEndpoints = failedIndices.map(i => subscriptions[i].endpoint);
      await PushSubscription.deleteMany({
        endpoint: { $in: failedEndpoints }
      });
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    res.json({
      success: true,
      message: `Đã gửi push notification đến ${successCount}/${subscriptions.length} thiết bị`,
      data: {
        premiumUsers: premiumUsers.length,
        totalSubscriptions: subscriptions.length,
        success: successCount,
        failed: failedIndices.length
      }
    });
  } catch (error) {
    console.error('Error sending push to all premium:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi push notification'
    });
  }
};

// Send test notification (for current user)
exports.sendTest = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's subscriptions
    const subscriptions = await PushSubscription.getByUserId(userId);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bạn chưa đăng ký push notification'
      });
    }

    // Send test notification
    const payload = JSON.stringify({
      title: '🎬 Test Notification',
      body: 'Push notification đang hoạt động! Bạn sẽ nhận được thông báo khi có phim mới.',
      icon: '/logo.png',
      badge: '/logo.png',
      url: '/',
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

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    res.json({
      success: true,
      message: `Đã gửi test notification đến ${successCount}/${subscriptions.length} thiết bị`,
      data: {
        total: subscriptions.length,
        success: successCount
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi test notification'
    });
  }
};
