const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public route
router.get('/plans', subscriptionController.getPlans);
// Protected routes
router.post('/create-upgrade', authMiddleware, subscriptionController.createManualUpgrade);
router.get('/status', authMiddleware, subscriptionController.getSubscriptionStatus);
router.post('/cancel-auto-renew', authMiddleware, subscriptionController.cancelAutoRenew);
router.get('/payment-history', authMiddleware, subscriptionController.getPaymentHistory);

module.exports = router;
