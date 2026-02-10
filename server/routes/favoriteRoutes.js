const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Protected Routes
router.use(authMiddleware);

router.post('/', favoriteController.addFavorite);
router.delete('/:slug', favoriteController.removeFavorite);
router.get('/:slug/check', favoriteController.checkFavorite);
router.get('/', favoriteController.getFavorites);
router.post('/sync', favoriteController.syncFavorites);

module.exports = router;
