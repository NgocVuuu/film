const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Save/update progress
router.post('/save', progressController.saveProgress);

// Get progress for specific movie
router.get('/movie/:movieSlug', progressController.getProgress);

// Get continue watching list
router.get('/continue-watching', progressController.getContinueWatching);

// Delete specific episode progress
router.delete('/:movieSlug/:episodeSlug', progressController.deleteProgress);

// Clear all progress for a movie
router.delete('/movie/:movieSlug', progressController.clearMovieProgress);

module.exports = router;
