const axios = require('axios');
const MovieRequest = require('../models/MovieRequest');
const Movie = require('../models/Movie');

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

        // Try to process immediately in background
        setImmediate(() => processMovieRequest(request._id));

        res.json({
            success: true,
            data: request,
            message: 'Yêu cầu của bạn đã được ghi nhận. Phim sẽ được cập nhật trong ít phút!'
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
        const request = await MovieRequest.findById(requestId);
        if (!request || request.status !== 'pending') return;

        // Update status to processing
        request.status = 'processing';
        await request.save();

        // Try to find and crawl from ophim
        let movieData;

        if (request.movieSlug) {
            // Direct slug provided
            const response = await axios.get(`https://ophim1.com/phim/${request.movieSlug}`, {
                timeout: 10000
            });
            if (response.data.status === 'success') {
                movieData = response.data.movie;
            }
        } else {
            // Search by name
            const searchResponse = await axios.get(`https://ophim1.com/v1/api/tim-kiem`, {
                params: { keyword: request.movieName },
                timeout: 10000
            });

            if (searchResponse.data.status === 'success' && searchResponse.data.data.items.length > 0) {
                const firstResult = searchResponse.data.data.items[0];
                const detailResponse = await axios.get(`https://ophim1.com/phim/${firstResult.slug}`);
                if (detailResponse.data.status === 'success') {
                    movieData = detailResponse.data.movie;
                }
            }
        }

        if (movieData) {
            // Save to database
            await Movie.findOneAndUpdate(
                { slug: movieData.slug },
                { $set: movieData },
                { upsert: true, new: true }
            );

            // Update request status
            request.status = 'completed';
            request.processedAt = new Date();
            request.movieSlug = movieData.slug;
            await request.save();

            console.log(`[REQUEST] Successfully added: ${movieData.name}`);
        } else {
            throw new Error('Không tìm thấy phim trên nguồn');
        }
    } catch (error) {
        console.error(`[REQUEST] Error processing ${requestId}:`, error.message);

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
