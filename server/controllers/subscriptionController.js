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
                price: 50000,
                features: [
                    'Xem phim không quảng cáo',
                    'Lưu tiến độ xem không giới hạn',
                    'Chất lượng HD/FullHD/4K',
                    'Ưu tiên luồng tải tốc độ cao'
                ]
            },
            {
                id: 'premium-3m',
                name: 'Gói 3 Tháng',
                tier: 'premium',
                duration: 3,
                price: 130000,
                originalPrice: 150000,
                badge: 'Tiết kiệm 20k',
                features: [
                    'Tất cả tính năng Premium',
                    'Dành cho người mới bắt đầu',
                    'Kích hoạt nhanh qua WeScan'
                ]
            },
            {
                id: 'premium-6m',
                name: 'Gói 6 Tháng',
                tier: 'premium',
                duration: 6,
                price: 250000,
                originalPrice: 300000,
                badge: 'Phổ biến nhất (Tiết kiệm 50k)',
                features: [
                    'Tất cả tính năng Premium',
                    'Bảo hành trọn đời gói cước',
                    'Hỗ trợ cài đặt PWA ưu tiên'
                ]
            },
            {
                id: 'premium-12m',
                name: 'Gói 1 Năm',
                tier: 'premium',
                duration: 12,
                price: 450000,
                originalPrice: 600000,
                badge: 'Siêu Tiết kiệm (Giảm 150k)',
                features: [
                    'Tất cả tính năng Premium',
                    'Huy hiệu "Fan Cứng" tại Profile',
                    'Không bao giờ lo bị gián đoạn'
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

        // Link VietQR Động để in ra trên Modal (nếu xài WeScan MBBank)
        const qrUrl = `https://qr.sepay.vn/img?bank=${bankCode}&acc=${accNum}&template=compact&amount=${amount}&des=${paymentCode}`;

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
