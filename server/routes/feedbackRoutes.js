const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Feedback routes - allow both authenticated and anonymous feedback
router.post('/', optionalAuthMiddleware, feedbackController.submitFeedback);

module.exports = router;
