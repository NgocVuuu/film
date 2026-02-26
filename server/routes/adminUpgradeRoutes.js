const express = require('express');
const router = express.Router();
const {
    getAllUpgrades,
    approveUpgrade,
    rejectUpgrade
} = require('../controllers/adminUpgradeController');

const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getAllUpgrades);
router.put('/:id/approve', approveUpgrade);
router.put('/:id/reject', rejectUpgrade);

module.exports = router;
