const Payment = require('../models/Payment');
const User = require('../models/User');
const moment = require('moment');

// Get subscription plans
exports.getPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: 'premium-1m',
                name: 'Premium - 1 Tháng',
                tier: 'premium',
                duration: 1,
                price: 49000, // 49k VND
                features: [
                    'Xem phim không quảng cáo',
                    'Lưu tiến độ xem không giới hạn',
                    'Chất lượng HD/FullHD',
                    'Hỗ trợ ưu tiên'
                ]
            },
            {
                id: 'premium-3m',
                name: 'Premium - 3 Tháng',
                tier: 'premium',
                duration: 3,
                price: 129000, // 129k VND (save 18k)
                originalPrice: 147000,
                features: [
                    'Tất cả tính năng Premium',
                    'Tiết kiệm 12% so với gói tháng',
                    'Gia hạn tự động'
                ]
            },
            {
                id: 'premium-6m',
                name: 'Premium - 6 Tháng',
                tier: 'premium',
                duration: 6,
                price: 239000, // 239k VND (save 55k)
                originalPrice: 294000,
                badge: 'Phổ biến',
                features: [
                    'Tất cả tính năng Premium',
                    'Tiết kiệm 19% so với gói tháng',
                    'Gia hạn tự động'
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

        // Create pending payment record
        const payment = await Payment.create({
            userId,
            amount,
            provider: 'sepay', // Changed from vnpay
            subscriptionTier: 'premium',
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
exports.handleSepayWebhook = async (req, res) => {
    try {
        const data = req.body;
        console.log('SePay Webhook:', JSON.stringify(data));

        // SePay data fields: { id, gateway, transactionDate, accountNumber, subAccount, code, content, transferType, description, transferAmount, referenceCode } - Verify docs
        // Assuming standard fields: content, transferAmount

        const content = data.content;
        const amount = data.transferAmount;

        if (!content || !amount) {
            return res.status(200).json({ success: true, message: 'Ignored: No content/amount' });
        }

        // Parse ID from content: PCHILL ABCDEF
        const match = content.match(/PCHILL\s*([A-Z0-9]{6})/i);
        if (!match) {
            return res.status(200).json({ success: true, message: 'Ignored: Content format mismatch' });
        }

        const paymentCodeSuffix = match[1];

        // Find pending payment with matching code or ID suffix
        // Since we only stored the suffix in 'code' or need to search by ID suffix
        // Ideally we should use full ID or a unique code.
        // Let's search payments where _id ends with suffix AND status is pending

        // Note: _id is ObjectId. Converting to string in query might be slow.
        // Better: search by `code` field if we saved it.
        const payment = await Payment.findOne({
            code: `PCHILL ${paymentCodeSuffix.toUpperCase()}`,
            status: 'pending'
        });

        if (!payment) {
            console.log('Payment not found for code:', paymentCodeSuffix);
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
        payment.transactionId = data.id || data.referenceCode; // SePay ID
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
