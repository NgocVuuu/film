const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Public route for tracking views (anonymous allowed)
router.post('/track-view', progressController.trackView);

// Save/update progress (allows anonymous)
router.post('/save', optionalAuthMiddleware, progressController.saveProgress);

// All other routes below require authentication
router.use(authMiddleware);

// Get progress for specific movie
router.get('/movie/:movieSlug', progressController.getProgress);

// Get continue watching list
router.get('/continue-watching', progressController.getContinueWatching);

// Delete specific episode progress
router.delete('/:movieSlug/:episodeSlug', progressController.deleteProgress);

// Clear all progress for a movie
router.delete('/movie/:movieSlug', progressController.clearMovieProgress);

// Clear all progress for all movies
router.delete('/clear-all', progressController.clearAllProgress);

module.exports = router;
