const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Home Data (New) - Cache for 5 minutes (300s)
router.get('/movies/home', cacheMiddleware(300), optionalAuthMiddleware, movieController.getHomeData);

// List Movies (Existing: /api/movies) - Cache for 2 minutes
router.get('/movies', cacheMiddleware(120), optionalAuthMiddleware, movieController.getMovies);

// Movie Detail (Existing: /api/movie/:slug) - Cache for 10 minutes
router.get('/movie/:slug', cacheMiddleware(600), optionalAuthMiddleware, movieController.getMovieDetail);

module.exports = router;
