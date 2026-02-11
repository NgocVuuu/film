const Report = require('../models/Report');

// 1. Create Report
const createReport = async (req, res) => {
    try {
        const { movieSlug, movieName, episodeSlug, episodeName, content } = req.body;
        const userId = req.user._id;

        const report = new Report({
            userId,
            movieSlug,
            movieName,
            episodeSlug,
            episodeName,
            content
        });

        await report.save();
        res.status(201).json({ success: true, message: 'Báo lỗi thành công! Cảm ơn bạn đã đóng góp.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get All Reports (Admin)
const getReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('userId', 'displayName email')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: reports });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createReport,
    getReports
};
