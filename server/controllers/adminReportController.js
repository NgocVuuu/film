const Report = require('../models/Report');
const User = require('../models/User');

// Get all reports (Admin)
exports.getAllReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { status } = req.query;

        let query = {};
        if (status) query.status = status;

        const reports = await Report.find(query)
            .populate('userId', 'displayName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Report.countDocuments(query);

        res.json({
            success: true,
            data: reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resolve report (Update status)
exports.resolveReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body; // 'fixed' or 'rejected'

        if (!['fixed', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const report = await Report.findByIdAndUpdate(
            reportId,
            { status },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
        }

        res.json({
            success: true,
            message: status === 'fixed' ? 'Đã đánh dấu đã sửa' : 'Đã đánh dấu từ chối',
            data: report
        });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
