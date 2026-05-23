const UpgradeRequest = require('../models/UpgradeRequest');
const User = require('../models/User');

/**
 * Lấy tất cả các yêu cầu nâng cấp
 */
exports.getAllUpgrades = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        const query = {};
        if (status) query.status = status;

        const upgrades = await UpgradeRequest.find(query)
            .populate('userId', 'displayName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await UpgradeRequest.countDocuments(query);

        res.json({
            success: true,
            data: upgrades,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all upgrades error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu cầu' });
    }
};

/**
 * Phê duyệt yêu cầu nâng cấp - cộng tháng và cập nhật tier đúng (premium/vip)
 */
exports.approveUpgrade = async (req, res) => {
    try {
        const { id } = req.params;
        const upgrade = await UpgradeRequest.findById(id);

        if (!upgrade) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        }
        if (upgrade.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Yêu cầu này đã được xử lý' });
        }

        const user = await User.findById(upgrade.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // Cộng dồn thời gian (tháng)
        const now = new Date();
        const currentEndDate = (user.subscription && user.subscription.endDate && user.subscription.endDate > now)
            ? new Date(user.subscription.endDate)
            : now;

        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + upgrade.durationMonths);

        // Upgrade tier: nếu upgrade là vip thì luôn set vip, nếu là premium thì chỉ set premium nếu chưa vip
        const newTier = upgrade.tier === 'vip' ? 'vip' : (user.subscription?.tier === 'vip' ? 'vip' : 'premium');

        user.subscription = {
            tier: newTier,
            status: 'active',
            startDate: user.subscription?.startDate || now,
            endDate: newEndDate,
            autoRenew: false
        };

        await user.save();

        upgrade.status = 'approved';
        upgrade.resolvedAt = new Date();
        await upgrade.save();

        const tierLabel = newTier === 'vip' ? 'PChill VIP' : 'Premium';
        res.json({
            success: true,
            message: `Đã phê duyệt! ${user.displayName} được cộng ${upgrade.durationMonths} tháng ${tierLabel}.`,
            data: upgrade
        });
    } catch (error) {
        console.error('Approve upgrade error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi phê duyệt yêu cầu' });
    }
};

/**
 * Từ chối yêu cầu nâng cấp
 */
exports.rejectUpgrade = async (req, res) => {
    try {
        const { id } = req.params;
        const upgrade = await UpgradeRequest.findById(id);

        if (!upgrade) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        }

        upgrade.status = 'rejected';
        upgrade.resolvedAt = new Date();
        await upgrade.save();

        res.json({
            success: true,
            message: 'Đã từ chối yêu cầu nâng cấp',
            data: upgrade
        });
    } catch (error) {
        console.error('Reject upgrade error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi từ chối yêu cầu' });
    }
};
