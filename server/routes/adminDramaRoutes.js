const express = require('express');
const router = express.Router();
const {
    getAllReactions,
    deleteReaction,
    getDramaMovies,
    updateDramaCounts
} = require('../controllers/adminDramaController');

const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

// Get drama movies list (BXH)
router.get('/movies', getDramaMovies);

// Get recent reaction logs (Nhật ký vote)
router.get('/reactions', getAllReactions);

// Update a movie's fire/trash count manually
router.put('/movies/:slug/counts', updateDramaCounts);

// Delete a specific reaction log
router.delete('/reactions/:id', deleteReaction);

module.exports = router;
