const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');

// User: Get or create their conversation with admin
const getMyConversation = async (req, res) => {
    try {
        if (req.user.role === 'guest') {
            return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng tính năng chat' });
        }

        let conversation = await ChatConversation.findOne({ userId: req.user._id })
            .populate('userId', 'displayName avatar email');

        if (!conversation) {
            conversation = await ChatConversation.create({ userId: req.user._id });
            conversation = await ChatConversation.findById(conversation._id)
                .populate('userId', 'displayName avatar email');
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        console.error('getMyConversation error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Get messages for a conversation (paginated)
const getMessages = async (req, res) => {
    try {
        if (req.user.role === 'guest') {
            return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng tính năng chat' });
        }

        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Check access: user can only access their own conversation
        const conversation = await ChatConversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Cuộc hội thoại không tồn tại' });
        }

        if (req.user.role !== 'admin' && conversation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
        }

        const messages = await ChatMessage.find({ conversationId: id })
            .populate('senderId', 'displayName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ChatMessage.countDocuments({ conversationId: id });

        res.json({
            success: true,
            data: messages.reverse(),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('getMessages error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Send a message (REST fallback - main send via socket)
const sendMessage = async (req, res) => {
    try {
        if (req.user.role === 'guest') {
            return res.status(403).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng tính năng chat' });
        }

        const { id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được rỗng' });
        }

        const conversation = await ChatConversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Cuộc hội thoại không tồn tại' });
        }

        if (req.user.role !== 'admin' && conversation.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
        }

        const senderRole = req.user.role === 'admin' ? 'admin' : 'user';

        const message = await ChatMessage.create({
            conversationId: id,
            senderId: req.user._id,
            senderRole,
            content: content.trim()
        });

        // Update conversation last message
        await ChatConversation.findByIdAndUpdate(id, {
            lastMessage: content.trim().substring(0, 100),
            lastMessageAt: new Date(),
            $inc: senderRole === 'user' ? { unreadAdmin: 1 } : { unreadUser: 1 }
        });

        const populated = await ChatMessage.findById(message._id)
            .populate('senderId', 'displayName avatar');

        res.json({ success: true, data: populated });
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin: Get all conversations
const getAllConversations = async (req, res) => {
    try {
        const conversations = await ChatConversation.find()
            .populate({
                path: 'userId',
                select: 'displayName avatar email role',
                match: { role: { $ne: 'guest' } }
            })
            .sort({ lastMessageAt: -1 });

        const validConversations = conversations.filter(c => c.userId);

        res.json({ success: true, data: validConversations });
    } catch (error) {
        console.error('getAllConversations error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Mark conversation as read
const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'admin';

        await ChatConversation.findByIdAndUpdate(id, {
            [isAdmin ? 'unreadAdmin' : 'unreadUser']: 0
        });

        res.json({ success: true });
    } catch (error) {
        console.error('markRead error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getMyConversation, getMessages, sendMessage, getAllConversations, markRead };
