const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminSubscriptionController = require('../controllers/adminSubscriptionController');
const adminRequestController = require('../controllers/adminRequestController');
const adminCrawlerController = require('../controllers/adminCrawlerController');
const adminCommentController = require('../controllers/adminCommentController');
const adminReportController = require('../controllers/adminReportController');
const adminMovieController = require('../controllers/adminMovieController');
const adminNotificationController = require('../controllers/adminNotificationController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/ban', adminController.toggleBanUser);
router.delete('/users/:userId', adminController.deleteUser);

// Subscription management
router.get('/subscriptions', adminSubscriptionController.getAllSubscriptions);
router.post('/subscriptions/:userId/cancel', adminSubscriptionController.cancelSubscription);
router.get('/payments', adminSubscriptionController.getAllPayments);

// Movie request management
router.get('/movie-requests', adminRequestController.getAllMovieRequests);
router.post('/movie-requests/:requestId/approve', adminRequestController.approveRequest);
router.post('/movie-requests/:requestId/reject', adminRequestController.rejectRequest);

// Crawler management
router.post('/crawler/sync', adminCrawlerController.triggerSync);
router.get('/crawler/status', adminCrawlerController.getCrawlerStatus);
router.get('/crawler/blacklist', adminCrawlerController.getBlacklist);
router.post('/crawler/blacklist', adminCrawlerController.addToBlacklist);
router.delete('/crawler/blacklist', adminCrawlerController.removeFromBlacklist);

// Comment management
router.get('/comments', adminCommentController.getAllComments);
router.delete('/comments/:commentId', adminCommentController.deleteComment);
router.patch('/comments/:commentId/hide', adminCommentController.toggleHideComment);

// Report management
router.get('/reports', adminReportController.getAllReports);
router.patch('/reports/:reportId/resolve', adminReportController.resolveReport);

// Movie management
router.get('/movies', adminMovieController.getAllMovies);
router.patch('/movies/:slug', adminMovieController.updateMovie);
router.delete('/movies/:slug', adminMovieController.deleteMovie);
router.patch('/movies/:slug/featured', adminMovieController.toggleFeatured);

// Notification management
router.post('/notifications/broadcast', adminNotificationController.broadcastNotification);
router.post('/notifications/user/:userId', adminNotificationController.sendToUser);
router.get('/notifications/sent', adminNotificationController.getSentNotifications);

// Test email (for debugging SMTP)
const adminEmailController = require('../controllers/adminEmailController');
router.post('/test-email', adminEmailController.testEmail);

module.exports = router;
