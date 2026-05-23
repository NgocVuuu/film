const Payment = require('../models/Payment');
const UpgradeRequest = require('../models/UpgradeRequest');
const User = require('../models/User');
const moment = require('moment');

// Get subscription plans
exports.getPlans = async (req, res) => {
    try {
        const plans = [
            // ===== PREMIUM PLANS (No Ads) =====
            {
                id: 'premium-1m',
                name: 'Premium 1 Tháng',
                tier: 'premium',
                duration: 1,
                price: 25000,
                features: [
                    'Xem phim không quảng cáo',
                    'Lưu tiến độ xem không giới hạn',
                    'Hỗ trợ ưu tiên'
                ]
            },
            {
                id: 'premium-3m',
                name: 'Premium 3 Tháng',
                tier: 'premium',
                duration: 3,
                price: 65000,
                originalPrice: 75000,
                features: [
                    'Tất cả tính năng Premium',
                    'Tiết kiệm 13% so với gói tháng',
                    'Cộng dồn thời gian'
                ]
            },
            {
                id: 'premium-6m',
                name: 'Premium 6 Tháng',
                tier: 'premium',
                duration: 6,
                price: 120000,
                originalPrice: 150000,
                badge: 'Phổ biến',
                features: [
                    'Tất cả tính năng Premium',
                    'Tiết kiệm 20% so với gói tháng',
                    'Cộng dồn thời gian'
                ]
            },
            {
                id: 'premium-12m',
                name: 'Premium 1 Năm',
                tier: 'premium',
                duration: 12,
                price: 220000,
                originalPrice: 300000,
                features: [
                    'Tất cả tính năng Premium',
                    'Tiết kiệm 27% so với gói tháng',
                    'Cộng dồn thời gian',
                    'Ưu đãi dành cho fan cứng'
                ]
            },
            // ===== VIP PLANS (No Ads + VIP Servers) =====
            {
                id: 'vip-1m',
                name: 'PChill VIP - 1 Tháng',
                tier: 'vip',
                duration: 1,
                price: 49000,
                features: [
                    'Tất cả tính năng Premium',
                    '💎 Truy cập máy chủ VIP tốc độ cao',
                    '💎 PChill VIP 1 & PChill VIP 2',
                    'Chất lượng cao nhất'
                ]
            },
            {
                id: 'vip-3m',
                name: 'PChill VIP - 3 Tháng',
                tier: 'vip',
                duration: 3,
                price: 129000,
                originalPrice: 147000,
                badge: '💎 Phổ biến VIP',
                features: [
                    'Tất cả tính năng VIP',
                    'Tiết kiệm 12% so với gói tháng',
                    'Cộng dồn thời gian VIP'
                ]
            },
            {
                id: 'vip-12m',
                name: 'PChill VIP - 1 Năm',
                tier: 'vip',
                duration: 12,
                price: 449000,
                originalPrice: 588000,
                badge: '💎 Tốt nhất',
                features: [
                    'Tất cả tính năng VIP',
                    'Tiết kiệm 24% so với gói tháng',
                    'Ưu tiên hỗ trợ 24/7',
                    'Sớm tiếp cận tính năng mới'
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

// Create payment URL (VietQR)
exports.createPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { planId, duration, amount } = req.body;

        if (!planId || !duration || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin thanh toán'
            });
        }

        // Determine tier from planId
        const subscriptionTier = planId && planId.startsWith('vip') ? 'vip' : 'premium';

        // Create pending payment record
        const payment = await Payment.create({
            userId,
            amount,
            provider: 'sepay', // Changed from vnpay
            subscriptionTier,
            subscriptionDuration: duration,
            status: 'pending',
            metadata: { planId }
        });

        // Bank Info from Env
        const bankCode = process.env.BANK_CODE || 'MB';
        const accNum = process.env.BANK_ACC_NUM || '0000000000';
        const accName = process.env.BANK_ACC_NAME || 'ADMIN';

        // Content: PCHILL <PaymentID>
        // Shortened to fit bank limits
        const content = `PCHILL ${payment._id.toString().slice(-6).toUpperCase()}`;

        // Save content to payment for matching later (or just match by partial ID)
        payment.code = content;
        await payment.save();

        // Generate VietQR URL
        // https://qr.sepay.vn/img?bank=BANK&acc=ACC&template=compact&amount=AMOUNT&des=CONTENT
        const qrUrl = `https://qr.sepay.vn/img?bank=${bankCode}&acc=${accNum}&template=compact&amount=${amount}&des=${content}`;

        res.json({
            success: true,
            data: {
                paymentId: payment._id,
                qrUrl,
                content,
                amount,
                bankInfo: {
                    bankCode,
                    accountNumber: accNum,
                    accountName: accName
                }
            },
            message: 'Đã tạo mã thanh toán QR'
        });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo thanh toán'
        });
    }
};

// Handle SePay Webhook
// Handle SePay Webhook
exports.handleSepayWebhook = async (req, res) => {
    try {
        const data = req.body;
        console.log('SePay Webhook:', JSON.stringify(data));

        // 1. Security Check: Verify API Key (Simple Token Authentication)
        // SePay doesn't have partial signature verification yet, so we use a shared secret in the query or body or header.
        // Assuming we configure SePay to send ?api_key=... or we check a specific header if supported.
        // OR: We enforce that the "content" MUST contain our specific code pattern which is hard to guess? No, that's weak.
        // BEST PRACTICE for now: Check if `api_key` param matches env variable (if SePay supports custom params)
        // OR better: Since SePay webhook setup allows adding params to the URL, we assume the webhook URL is configured as:
        // https://api.pchill.com/api/subscriptions/webhook/sepay?api_key=YOUR_SECRET_KEY

        const apiKey = req.query.api_key;
        if (!process.env.SEPAY_API_KEY || apiKey !== process.env.SEPAY_API_KEY) {
            console.warn('[SePay Security] Invalid or missing API Key.');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const content = data.content;
        const amount = data.transferAmount;
        const transactionId = data.id || data.referenceCode; // SePay Transaction ID

        if (!content || !amount || !transactionId) {
            return res.status(200).json({ success: true, message: 'Ignored: Missing required fields' });
        }

        // 2. Idempotency Check (Prevent Double Payment)
        // Check if this incoming transaction ID has already been processed
        const existingTransaction = await Payment.findOne({
            $or: [
                { transactionId: transactionId.toString() },
                { 'metadata.sepayData.id': transactionId }
            ],
            status: 'completed'
        });

        if (existingTransaction) {
            console.log(`[SePay Idempotency] Transaction ${transactionId} already processed.`);
            return res.status(200).json({ success: true, message: 'Ignored: Transaction already processed' });
        }

        // Parse ID from content: PCHILL <CODE>
        // We use the `code` field in Payment to match EXACTLY
        // data.content might contain extra text like "MBVCB PCHILL ABC...", so we regex or partial match
        const match = content.match(/PCHILL\s*([A-Z0-9]{6})/i);
        if (!match) {
            return res.status(200).json({ success: true, message: 'Ignored: Content format mismatch' });
        }

        const paymentCodeSuffix = match[1].toUpperCase();
        const infoToMatch = `PCHILL ${paymentCodeSuffix}`;

        // Find pending payment
        const payment = await Payment.findOne({
            code: infoToMatch,
            status: 'pending'
        });

        if (!payment) {
            console.log('Payment not found for code:', infoToMatch);
            return res.status(200).json({ success: true, message: 'Ignored: Payment not found' });
        }

        // Verify amount
        if (amount < payment.amount) {
            console.log('Amount mismatch:', amount, '<', payment.amount);
            return res.status(200).json({ success: true, message: 'Ignored: Amount too low' });
        }

        // Activate Subscription
        const user = await User.findById(payment.userId);
        if (!user) {
            return res.status(200).json({ success: true, message: 'User not found' });
        }

        const now = new Date();
        const endDate = user.subscription.status === 'active' && user.subscription.endDate > now
            ? new Date(user.subscription.endDate)
            : new Date();

        endDate.setMonth(endDate.getMonth() + payment.subscriptionDuration);

        user.subscription = {
            tier: payment.subscriptionTier,
            status: 'active',
            startDate: user.subscription.startDate || now,
            endDate: endDate,
            autoRenew: false
        };
        await user.save();

        // Update payment status
        payment.status = 'completed';
        payment.transactionId = transactionId.toString(); // Save SePay ID to prevent reuse
        payment.metadata = { ...payment.metadata, sepayData: data };
        await payment.save();

        console.log(`[SePay Success] User ${user.email} activated via ${paymentCodeSuffix}`);

        res.json({
            success: true,
            message: 'Thanh toán thành công'
        });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ success: false, message: 'Error processing webhook' });
    }
};

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

// Tạo phiếu nâng cấp thủ công (Admin duyệt tay qua WeScan / BuyMeACoffee)
exports.createManualUpgrade = async (req, res) => {
    try {
        const userId = req.user._id;
        const { planId, planName, duration, amount } = req.body;

        if (!planId || !duration || !amount || !planName) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin gói cước'
            });
        }

        // Determine tier from planId
        const tier = planId.startsWith('vip') ? 'vip' : 'premium';

        // Generate unique VIP-XXXXXX code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const generateCode = () => {
            let code = 'VIP-';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        let paymentCode = generateCode();
        let isExist = await UpgradeRequest.findOne({ paymentCode, status: 'pending' });
        while (isExist) {
            paymentCode = generateCode();
            isExist = await UpgradeRequest.findOne({ paymentCode, status: 'pending' });
        }

        // Create upgrade request record
        const request = await UpgradeRequest.create({
            userId,
            planId,
            planName,
            tier,
            durationMonths: duration,
            amount,
            paymentCode,
            status: 'pending'
        });

        // Bank config
        const bankCode = process.env.BANK_CODE || 'MB';
        const accNum = process.env.BANK_ACC_NUM || '0000000000';
        const accName = process.env.BANK_ACC_NAME || 'ADMIN PCHILL';

        // VietQR dynamic QR
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
                }
            },
            message: 'Đã tạo phiếu đăng ký. Đang chờ admin duyệt (5-30 phút).'
        });
    } catch (error) {
        console.error('Create manual upgrade error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi khởi tạo giao dịch'
        });
    }
};
