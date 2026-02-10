const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Get comments (Public)
router.get('/:slug', commentController.getComments);

// Add comment (Protected)
router.post('/', authMiddleware, commentController.addComment);

// Delete comment (Protected)
router.delete('/:id', authMiddleware, commentController.deleteComment);

module.exports = router;
