const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, reportController.createReport);
router.get('/', protect, admin, reportController.getReports);

module.exports = router;
