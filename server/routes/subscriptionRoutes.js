const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public route
router.get('/plans', subscriptionController.getPlans);
router.post('/webhook/sepay', subscriptionController.handleSepayWebhook); // Public webhook

// Protected routes
router.post('/create-payment', authMiddleware, subscriptionController.createPayment); // Create QR
router.get('/status', authMiddleware, subscriptionController.getSubscriptionStatus);
router.post('/cancel-auto-renew', authMiddleware, subscriptionController.cancelAutoRenew);
router.get('/payment-history', authMiddleware, subscriptionController.getPaymentHistory);

module.exports = router;
