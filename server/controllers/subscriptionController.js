const Payment = require('../models/Payment');
const User = require('../models/User');
const UpgradeRequest = require('../models/UpgradeRequest');
const moment = require('moment');

// Get subscription plans
exports.getPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: 'premium-1m',
                name: 'Gói 1 Tháng',
                tier: 'premium',
                duration: 1,
                price: 59000,
                features: [
                    'Xem phim server riêng 4K',
                    'Trải nghiệm không quảng cáo',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'premium-3m',
                name: 'Gói 3 Tháng',
                tier: 'premium',
                duration: 3,
                price: 129000,
                originalPrice: 177000,
                badge: 'Tiết kiệm 48k',
                features: [
                    'Xem phim server riêng 4K',
                    'Trải nghiệm không quảng cáo',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'premium-6m',
                name: 'Gói 6 Tháng',
                tier: 'premium',
                duration: 6,
                price: 219000,
                originalPrice: 354000,
                badge: 'Phổ biến (Tiết kiệm 135k)',
                features: [
                    'Xem phim server riêng 4K',
                    'Trải nghiệm không quảng cáo',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'premium-12m',
                name: 'Gói 1 Năm',
                tier: 'premium',
                duration: 12,
                price: 359000,
                originalPrice: 708000,
                badge: 'Siêu hời (Giảm 50%)',
                features: [
                    'Xem phim server riêng 4K',
                    'Trải nghiệm không quảng cáo',
                    'Phòng xem chung độc quyền'
                ]
            },
            {
                id: 'family-1m',
                name: 'Gia Đình 1 Tháng',
                tier: 'family',
                duration: 1,
                price: 159000,
                badge: '5 Màn hình (Chỉ ~32k/người)',
                features: [
                    'Sử dụng Tối đa 5 Thiết bị',
                    'Xem phim server riêng 4K',
                    'Kho phim Netflix độc quyền',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'family-3m',
                name: 'Gia Đình 3 Tháng',
                tier: 'family',
                duration: 3,
                price: 379000,
                originalPrice: 477000,
                badge: 'Tiết kiệm 98k',
                features: [
                    'Sử dụng Tối đa 5 Thiết bị',
                    'Xem phim server riêng 4K',
                    'Kho phim Netflix độc quyền',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'family-6m',
                name: 'Gia Đình 6 Tháng',
                tier: 'family',
                duration: 6,
                price: 669000,
                originalPrice: 954000,
                badge: 'Siêu Rẻ (Giảm 285k)',
                features: [
                    'Sử dụng Tối đa 5 Thiết bị',
                    'Xem phim server riêng 4K',
                    'Kho phim Netflix độc quyền',
                    'Phòng xem chung (Watch Party)'
                ]
            },
            {
                id: 'family-12m',
                name: 'Gia Đình 1 Năm',
                tier: 'family',
                duration: 12,
                price: 999000,
                originalPrice: 1908000,
                badge: 'Mua 1 Tặng 1 (Giảm 1 Triệu)',
                features: [
                    'Sử dụng Tối đa 5 Thiết bị',
                    'Xem phim server riêng 4K',
                    'Kho phim Netflix độc quyền',
                    'Phòng xem chung (Watch Party)'
                ]
            }
        ];

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách gói'
        });
    }
};

// Khởi tạo Phiếu Nâng Cấp Manual (Thay thế SePay)
exports.createManualUpgrade = async (req, res) => {
    try {
        const userId = req.user._id;
        const { planId, duration, amount, planName } = req.body;

        if (!planId || !duration || !amount || !planName) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin gói cước'
            });
        }

        // Tạo chuỗi Random VIP-XXXXXX (6 chữ số)
        const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = 'VIP-';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        // Đảm bảo không trùng code
        let paymentCode = generateCode();
        let isExist = await UpgradeRequest.findOne({ paymentCode, status: 'pending' });
        while (isExist) {
            paymentCode = generateCode();
            isExist = await UpgradeRequest.findOne({ paymentCode, status: 'pending' });
        }

        // Create pending request
        const request = await UpgradeRequest.create({
            userId,
            planId,
            planName,
            durationDays: duration * 30, // Quy đổi tháng ra ngày (Tạm tính 1 tháng 30 ngày)
            amount,
            paymentCode,
            status: 'pending'
        });

        // Config thông tin QR Code WeScan
        const bankCode = process.env.BANK_CODE || 'MB';
        const accNum = process.env.BANK_ACC_NUM || '0000000000';
        const accName = process.env.BANK_ACC_NAME || 'ADMIN PCHILL';

        // Link VietQR Động để in ra trên Modal (Dùng api miễn phí img.vietqr.io)
        const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accNum}-compact2.jpg?amount=${amount}&addInfo=${paymentCode}&accountName=${encodeURIComponent(accName)}`;

        res.json({
            success: true,
            data: {
                requestId: request._id,
                qrUrl,
                content: paymentCode,
                amount,
                bankInfo: {
                    bankCode,
                    accountNumber: accNum,
                    accountName: accName
                },
                bmcUrl: `https://www.buymeacoffee.com/your-username` // URL BMC (Demo)
            },
            message: 'Đã tạo phiếu đăng ký. Đang chờ thanh toán.'
        });
    } catch (error) {
        console.error('Create upgrade request error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi khởi tạo giao dịch'
        });
    }
};

// ...XÓA BỎ SEPAY WEBHOOK VÌ ADMIN DUYỆT THỦ CÔNG...


// Get current subscription status
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const user = req.user;

        // Check if subscription has expired
        if (user.subscription.endDate && new Date(user.subscription.endDate) < new Date()) {
            user.subscription.status = 'expired';
            user.subscription.tier = 'free';
            await user.save();
        }

        res.json({
            success: true,
            data: user.subscription
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đăng ký'
        });
    }
};

// Cancel auto-renewal
exports.cancelAutoRenew = async (req, res) => {
    try {
        const user = req.user;

        user.subscription.autoRenew = false;
        await user.save();

        res.json({
            success: true,
            message: 'Đã hủy gia hạn tự động'
        });
    } catch (error) {
        console.error('Cancel auto-renew error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy gia hạn'
        });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const payments = await Payment.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Payment.countDocuments({ userId });

        res.json({
            success: true,
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử thanh toán'
        });
    }
};
