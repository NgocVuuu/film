const express = require('express');
const router = express.Router();
const torrentController = require('../controllers/torrentController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists based on common patterns

router.get('/stream', protect, torrentController.getStreamLink);

module.exports = router;
