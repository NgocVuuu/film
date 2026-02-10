const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

// Home Data (New)
router.get('/movies/home', movieController.getHomeData);

// List Movies (Existing: /api/movies)
router.get('/movies', movieController.getMovies);

// Movie Detail (Existing: /api/movie/:slug)
router.get('/movie/:slug', movieController.getMovieDetail);

module.exports = router;
