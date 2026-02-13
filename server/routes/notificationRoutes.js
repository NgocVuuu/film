const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const pushNotificationController = require('../controllers/pushNotificationController');
const { authMiddleware, premiumMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Public endpoint for VAPID key
router.get('/vapid-public-key', pushNotificationController.getVapidPublicKey);

// Protected notification routes
router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.post('/:id/read', notificationController.markAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Push notification routes (premium only)
router.post('/push/subscribe', premiumMiddleware, pushNotificationController.subscribe);
router.delete('/push/unsubscribe', pushNotificationController.unsubscribe);
router.post('/push/test', premiumMiddleware, pushNotificationController.sendTest);

// Admin push notification routes
router.post('/push/send-to-user', adminMiddleware, pushNotificationController.sendToUser);
router.post('/push/send-to-all-premium', adminMiddleware, pushNotificationController.sendToAllPremium);

module.exports = router;
