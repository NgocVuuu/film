const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:slug', commentController.getComments);
router.post('/', protect, commentController.addComment);
router.delete('/:id', protect, commentController.deleteComment);
router.post('/:id/like', protect, commentController.toggleLike);

module.exports = router;
