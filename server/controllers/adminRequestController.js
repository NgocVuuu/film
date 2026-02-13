const MovieRequest = require('../models/MovieRequest');
const { processMovieRequest } = require('./requestController');

// Get all movie requests (admin)
exports.getAllMovieRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        const query = status ? { status } : {};

        const requests = await MovieRequest.find(query)
            .populate('userId', 'displayName email phoneNumber')
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await MovieRequest.countDocuments(query);

        res.json({
            success: true,
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all movie requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu'
        });
    }
};

// Approve/Fetch movie request (auto-fetch from sources)
// This provides immediate processing for admin - manual trigger
exports.approveRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;

        const request = await MovieRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        if (request.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu đã được xử lý thành công'
            });
        }

        // Reset status to pending if failed before
        if (request.status === 'failed') {
            request.status = 'pending';
            request.errorMessage = null;
            await request.save();
        }

        // Process request immediately (manual admin trigger)
        // Note: Regular user requests are processed by GitHub Actions
        setImmediate(() => processMovieRequest(requestId));

        res.json({
            success: true,
            message: 'Đang tự động tải phim từ các nguồn (Manual trigger - xử lý ngay)...'
        });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý yêu cầu'
        });
    }
};

// Reject movie request
exports.rejectRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const { reason } = req.body;

        const request = await MovieRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        request.status = 'failed';
        request.errorMessage = reason || 'Đã bị từ chối bởi quản trị viên';
        request.processedAt = new Date();
        await request.save();

        res.json({
            success: true,
            message: 'Đã từ chối yêu cầu'
        });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối yêu cầu'
        });
    }
};
