const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Home Data (New) - Auth first, then cache for 5 minutes (300s)
router.get('/movies/home', optionalAuthMiddleware, cacheMiddleware(300), movieController.getHomeData);

// List Movies (Existing: /api/movies) - Cache for 2 minutes
router.get('/movies', cacheMiddleware(120), optionalAuthMiddleware, movieController.getMovies);

// Movie Detail (Existing: /api/movie/:slug) - Cache for 10 minutes
router.get('/movie/:slug', cacheMiddleware(600), optionalAuthMiddleware, movieController.getMovieDetail);

// Marvel Universe Collection
router.get('/movies/marvel', cacheMiddleware(600), movieController.getMarvelMovies);

// DC Universe Collection
router.get('/movies/dcu', cacheMiddleware(600), movieController.getDCUMovies);

// Stephen Chow Collection
router.get('/movies/stephenchow', cacheMiddleware(600), movieController.getStephenChowMovies);

// Korean Drama 2016 Collection
router.get('/movies/korean-drama-2016', cacheMiddleware(600), movieController.getKoreanDrama2016Movies);

// Sad / Healing Movies Collection
router.get('/movies/sad-movies', cacheMiddleware(600), movieController.getSadMovies);

module.exports = router;
