const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Home Data (New)
router.get('/movies/home', optionalAuthMiddleware, movieController.getHomeData);

// List Movies (Existing: /api/movies)
router.get('/movies', optionalAuthMiddleware, movieController.getMovies);

// Movie Detail (Existing: /api/movie/:slug)
router.get('/movie/:slug', optionalAuthMiddleware, movieController.getMovieDetail);

module.exports = router;
