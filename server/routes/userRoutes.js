const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Public route for leaderboard
router.get('/leaderboard', userController.getLeaderboard);

module.exports = router;
