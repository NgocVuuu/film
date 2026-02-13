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

const { sendNotification, sendToMultiple } = require('../utils/notificationService');

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

    await sendNotification(userId, {
      title,
      content: body,
      link: url,
      icon,
      type: 'system'
    });

    res.json({
      success: true,
      message: 'Đã gửi thông báo thành công'
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi thông báo'
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

    const premiumUserIds = premiumUsers.map(u => u._id.toString());

    if (premiumUserIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không có premium user nào'
      });
    }

    await sendToMultiple(premiumUserIds, {
      title,
      content: body,
      link: url,
      icon,
      type: 'subscription'
    });

    res.json({
      success: true,
      message: `Đã gửi thông báo đến ${premiumUserIds.length} premium users`
    });
  } catch (error) {
    console.error('Error sending push to all premium:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi thông báo'
    });
  }
};

// Send test notification (for current user)
exports.sendTest = async (req, res) => {
  try {
    const userId = req.user._id;

    await sendNotification(userId, {
      title: '🎬 Test Notification',
      content: 'Push notification đang hoạt động! Bạn sẽ nhận được thông báo khi có phim mới.',
      icon: '/logo.png',
      link: '/',
      type: 'system'
    });

    res.json({
      success: true,
      message: 'Đã gửi test notification'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi test notification'
    });
  }
};
