const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const requestController = require('../controllers/requestController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Hybrid search (public)
router.get('/', optionalAuthMiddleware, searchController.hybridSearch);

// Movie requests (protected)
router.post('/request', authMiddleware, requestController.requestMovie);
router.get('/my-requests', authMiddleware, requestController.getMyRequests);

module.exports = router;
