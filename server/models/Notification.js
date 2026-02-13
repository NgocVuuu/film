const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: '/'
    },
    type: {
        type: String,
        enum: [
            'episode',        // Phim có tập mới
            'movie_request',  // Phim được yêu cầu đã có sẵn
            'system',         // Thông báo hệ thống từ admin
            'subscription',   // Thông báo về gói VIP/thanh toán
            'comment',        // Thông báo về bình luận
            'security'        // Thông báo bảo mật
        ],
        default: 'system'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
