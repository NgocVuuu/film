const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
    getMyConversation,
    getMessages,
    sendMessage,
    getAllConversations,
    markRead
} = require('../controllers/chatController');

// User routes
router.get('/my', authMiddleware, getMyConversation);
router.get('/:id/messages', authMiddleware, getMessages);
router.post('/:id/send', authMiddleware, sendMessage);
router.patch('/:id/read', authMiddleware, markRead);

// Admin routes
router.get('/admin/all', authMiddleware, adminMiddleware, getAllConversations);

module.exports = router;
