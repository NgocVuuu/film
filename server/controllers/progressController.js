const WatchProgress = require('../models/WatchProgress');

// Save or update watch progress
exports.saveProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            movieId,
            movieSlug,
            movieName,
            movieThumb,
            episodeSlug,
            episodeName,
            serverName,
            currentTime,
            duration
        } = req.body;

        // Validate required fields
        if (!movieSlug || !episodeSlug || !serverName) {
            console.error('[saveProgress] Validation failed:', { movieSlug, episodeSlug, serverName });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin cần thiết'
            });
        }

        console.log('[saveProgress] Request:', { userId, movieSlug, episodeSlug, currentTime, duration });

        // Check if progress already exists
        let progress = await WatchProgress.findOne({
            userId,
            movieSlug,
            episodeSlug
        });

        const completed = duration > 0 && currentTime >= duration * 0.9; // 90% completion

        if (progress) {
            // Update existing progress
            progress.currentTime = currentTime;
            progress.duration = duration;
            progress.completed = completed;
            progress.lastWatched = new Date();
            progress.movieName = movieName || progress.movieName;
            progress.movieThumb = movieThumb || progress.movieThumb;
            progress.episodeName = episodeName || progress.episodeName;
            progress.serverName = serverName;
            await progress.save();
        } else {
            // Create new progress

            // CHECK PREMIUM LIMIT (Max 20 for free users)
            if (req.user.subscription?.tier !== 'premium') {
                const count = await WatchProgress.countDocuments({ userId });
                if (count >= 20) {
                    const oldest = await WatchProgress.findOne({ userId }).sort({ lastWatched: 1 });
                    if (oldest) {
                        await WatchProgress.deleteOne({ _id: oldest._id });
                    }
                }
            }

            progress = await WatchProgress.create({
                userId,
                movieId,
                movieSlug,
                movieName,
                movieThumb,
                episodeSlug,
                episodeName,
                serverName,
                currentTime,
                duration,
                completed,
                lastWatched: new Date()
            });
        }

        res.json({
            success: true,
            data: progress,
            message: 'Đã lưu tiến độ xem'
        });
    } catch (error) {
        console.error('[saveProgress] ERROR:', error);
        console.error('[saveProgress] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu tiến độ xem',
            error: error.message
        });
    }
};

// Get progress for a specific movie
exports.getProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { movieSlug } = req.params;

        const progress = await WatchProgress.find({
            userId,
            movieSlug
        }).sort({ lastWatched: -1 });

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy tiến độ xem'
        });
    }
};

// Get continue watching list
exports.getContinueWatching = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 12;

        // Use aggregation to group by movieSlug and get only the most recent episode for each movie
        const progress = await WatchProgress.aggregate([
            {
                $match: {
                    userId: userId,
                    completed: false // Only incomplete episodes
                }
            },
            {
                // Sort by lastWatched descending to get most recent first
                $sort: { lastWatched: -1 }
            },
            {
                // Group by movieSlug and take the first (most recent) document
                $group: {
                    _id: '$movieSlug',
                    doc: { $first: '$$ROOT' }
                }
            },
            {
                // Replace root with the document
                $replaceRoot: { newRoot: '$doc' }
            },
            {
                // Sort again by lastWatched after grouping
                $sort: { lastWatched: -1 }
            },
            {
                $limit: limit
            }
        ]);

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        console.error('Get continue watching error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đang xem'
        });
    }
};

// Delete progress for specific episode
exports.deleteProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { movieSlug, episodeSlug } = req.params;

        await WatchProgress.deleteOne({
            userId,
            movieSlug,
            episodeSlug
        });

        res.json({
            success: true,
            message: 'Đã xóa tiến độ xem'
        });
    } catch (error) {
        console.error('Delete progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa tiến độ xem'
        });
    }
};

// Clear all progress for a movie
exports.clearMovieProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { movieSlug } = req.params;

        await WatchProgress.deleteMany({
            userId,
            movieSlug
        });

        res.json({
            success: true,
            message: 'Đã xóa toàn bộ tiến độ xem của phim'
        });
    } catch (error) {
        console.error('Clear movie progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa tiến độ xem'
        });
    }
};
