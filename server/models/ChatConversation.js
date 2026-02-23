const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One conversation per user with admin
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadAdmin: {
        type: Number,
        default: 0
    },
    unreadUser: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
