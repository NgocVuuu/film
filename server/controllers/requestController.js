const MovieRequest = require('../models/MovieRequest');
const Movie = require('../models/Movie');
const Notification = require('../models/Notification');
const { syncSpecificMovie } = require('../crawler');

// Submit a movie request
exports.requestMovie = async (req, res) => {
    try {
        const userId = req.user._id;
        const { movieName, movieSlug, ophimUrl } = req.body;

        if (!movieName) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên phim'
            });
        }

        // Check if movie already exists
        if (movieSlug) {
            const existing = await Movie.findOne({ slug: movieSlug });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Phim này đã có trong hệ thống'
                });
            }
        }

        // Check if request already exists
        let request = await MovieRequest.findOne({
            movieSlug,
            status: { $in: ['pending', 'processing'] }
        });

        if (request) {
            // Increment request count and priority
            request.requestCount += 1;
            request.priority += 1;
            await request.save();

            return res.json({
                success: true,
                data: request,
                message: 'Yêu cầu của bạn đã được ghi nhận. Phim sẽ được cập nhật sớm!'
            });
        }

        // Create new request
        request = await MovieRequest.create({
            userId,
            movieName,
            movieSlug,
            ophimUrl,
            priority: 1
        });

        // Note: Processing moved to GitHub Actions (runs every 30 min)
        // Admin can manually trigger immediate processing if needed

        res.json({
            success: true,
            data: request,
            message: 'Yêu cầu của bạn đã được ghi nhận. Phim sẽ được cập nhật trong vòng 30 phút (hoặc sớm hơn nếu admin xử lý ngay)!'
        });
    } catch (error) {
        console.error('Request movie error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi yêu cầu'
        });
    }
};

// Get user's movie requests
exports.getMyRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const requests = await MovieRequest.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await MovieRequest.countDocuments({ userId });

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
        console.error('Get requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu'
        });
    }
};

// Background processor for movie requests
async function processMovieRequest(requestId) {
    try {
        const request = await MovieRequest.findById(requestId).populate('userId', 'displayName');
        if (!request) return;
        
        // Skip if already processed
        if (request.status !== 'pending' && request.status !== 'processing') return;

        // Update status to processing
        request.status = 'processing';
        await request.save();

        console.log(`[REQUEST] Processing request: ${request.movieName} (${request.movieSlug || 'no slug'})`);

        let slug = request.movieSlug;

        // If no slug provided, try to search and find one
        if (!slug && request.movieName) {
            // Try to auto-generate slug from movie name
            slug = request.movieName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
            
            console.log(`[REQUEST] Generated slug from name: ${slug}`);
        }

        if (!slug) {
            throw new Error('Không có slug để tìm phim. Vui lòng cung cấp tên phim chính xác.');
        }

        // Use the new crawler to fetch movie from all sources
        const result = await syncSpecificMovie(slug, null);

        if (result.success) {
            // Update request status to completed
            request.status = 'completed';
            request.processedAt = new Date();
            request.movieSlug = slug;
            await request.save();

            // Send notification to all users who requested this movie
            const allRequests = await MovieRequest.find({
                movieSlug: slug,
                status: 'completed'
            }).populate('userId');

            const notifications = allRequests.map(req => ({
                recipient: req.userId._id,
                content: `Phim "${request.movieName}" bạn yêu cầu đã có sẵn! Xem ngay`,
                link: `/movie/${slug}`,
                type: 'movie_request',
                isRead: false
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                console.log(`[REQUEST] Sent ${notifications.length} notifications for ${request.movieName}`);
            }

            console.log(`[REQUEST] ✓ Successfully added: ${request.movieName} from ${result.source}`);
        } else {
            throw new Error(result.error || 'Không thể tải phim từ bất kỳ nguồn nào');
        }
    } catch (error) {
        console.error(`[REQUEST] ✗ Error processing ${requestId}:`, error.message);

        // Update request with error
        await MovieRequest.findByIdAndUpdate(requestId, {
            status: 'failed',
            errorMessage: error.message,
            processedAt: new Date()
        });
    }
}

// Admin: Get all requests
exports.getAllRequests = async (req, res) => {
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
        console.error('Get all requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu'
        });
    }
};

module.exports.processMovieRequest = processMovieRequest;
