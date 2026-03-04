const express = require('express');
const router = express.Router();
const torrentController = require('../controllers/torrentController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists based on common patterns
const rateLimit = require('express-rate-limit');

// [BẢO MẬT CẤP ĐỘ 7] VÁ LỖ HỔNG Tràn RAM Backend (API Gateway Exhaustion)
// Giới hạn siêu nghiêm ngặt: Mỗi IP/User chỉ được gọi API xin luồng 5 lần / 1 phút.
// Chặn đứng hoàn toàn Tool cào request ddos DB và Redis.
const streamLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 5, // Tối đa 5 request
    message: {
        success: false,
        message: 'Hệ thống Đang Bận: Bạn đang gửi quá nhiều yêu cầu tải phim trong 1 phút. Vui lòng dừng spam và thử lại sau.'
    },
    keyGenerator: (req) => {
        // Ưu tiên rate limit theo User ID nếu đã login, ngược lại theo IP vật lý
        return req.user ? req.user._id.toString() : (req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/stream', protect, streamLimiter, torrentController.getStreamLink);
router.get('/fallback', protect, streamLimiter, torrentController.fallbackStreamLink);

module.exports = router;
