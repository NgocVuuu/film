const WatchProgress = require('../models/WatchProgress');
const NodeCache = require('node-cache');
const viewCache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // 24 hours standard TTL

// Save or update watch progress
exports.saveProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        // sendBeacon sends body as Blob with application/octet-stream; parse manually if needed
        let body = req.body;
        if (!body || !body.movieSlug) {
            try {
                const raw = req.rawBody || '';
                if (raw) body = JSON.parse(raw);
            } catch { /* ignore */ }
        }
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
        } = body;

        // Validate required fields
        if (!movieSlug || !episodeSlug || !serverName) {
            console.error('[saveProgress] Validation failed:', { movieSlug, episodeSlug, serverName });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin cần thiết'
            });
        }

        console.log('[saveProgress] Request:', { userId, movieSlug, episodeSlug, currentTime, duration });

        // Check if progress already exists for this episode, ignoring serverName so progress is shared between servers
        const allProgress = await WatchProgress.find({
            userId,
            movieSlug,
            episodeSlug
        }).sort({ lastWatched: -1 });

        let progress = allProgress[0];

        // Cleanup duplicates from the old schema where serverName was separate
        if (allProgress.length > 1) {
            const idsToDelete = allProgress.slice(1).map(p => p._id);
            await WatchProgress.deleteMany({ _id: { $in: idsToDelete } });
        }

        const completed = duration > 0 && currentTime >= duration * 0.9; // 90% completion

        if (progress) {
            // Always update progress unless the new time is somehow magically 0 and we already have a long progress recorded
            // The client already blocks currentTime < 5, so we should trust the client for seeks backwards or forwards.
            if (currentTime >= 5 || progress.currentTime < 5) {
                progress.currentTime = currentTime;
                progress.duration = duration;
                progress.completed = completed;
                progress.lastWatched = new Date();
                progress.movieName = movieName || progress.movieName;
                progress.movieThumb = movieThumb || progress.movieThumb;
                progress.episodeName = episodeName || progress.episodeName;
                progress.serverName = serverName;
                await progress.save();
            }
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

        // VIEW LOGGING LOGIC
        // Check if user has viewed this episode in the last 24 hours
        // If not, create a ViewLog entry
        const viewCacheKey = `view_${userId}_${movieSlug}_${episodeSlug}`;
        
        if (!viewCache.has(viewCacheKey)) {
            const ViewLog = require('../models/ViewLog');
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const existingLog = await ViewLog.findOne({
                userId,
                movieSlug,
                episodeSlug,
                createdAt: { $gte: twentyFourHoursAgo }
            });

            if (!existingLog) {
                await ViewLog.create({
                    userId,
                    movieSlug,
                    episodeSlug
                });
                // Update total view count in Movie model if needed (optional optimization)
                const Movie = require('../models/Movie');
                await Movie.updateOne({ slug: movieSlug }, { $inc: { view: 1 } });
            }
            
            // Mới xem, lưu vào RAM Cache để 24h sau khỏi check DB nữa
            viewCache.set(viewCacheKey, true);
        }

        // ACTIVE USER LOGIC
        // Update lastLogin if user hasn't been active today
        // This ensures the "Active Users" chart includes people watching movies, not just logging in
        const loginCacheKey = `login_${userId}`;
        
        if (!viewCache.has(loginCacheKey)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (req.user.lastLogin < today) {
                const User = require('../models/User');
                await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
            }
            
            // Set cache 12 hours so it doesn't query DB
            viewCache.set(loginCacheKey, true, 12 * 60 * 60);
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
// Clear all progress for all movies
exports.clearAllProgress = async (req, res) => {
    try {
        const userId = req.user._id;

        await WatchProgress.deleteMany({ userId });

        res.json({
            success: true,
            message: 'Đã xóa toàn bộ lịch sử xem'
        });
    } catch (error) {
        console.error('Clear all progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa lịch sử xem'
        });
    }
};

// Track view (public/anonymous)
exports.trackView = async (req, res) => {
    try {
        const { movieSlug, episodeSlug } = req.body;
        // Check if user is logged in (optional)
        const userId = req.user ? req.user._id : null;
        const reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        if (!movieSlug || !episodeSlug) {
            return res.status(400).json({ success: false, message: 'Missing info' });
        }

        // Cache check to prevent spam
        const viewCacheKey = `guest_view_${reqIp}_${movieSlug}_${episodeSlug}`;
        if (viewCache.has(viewCacheKey)) {
            // Already logged a view for this IP/episode in the last hour
            return res.json({ success: true, message: 'View tracked (cached)' });
        }

        const ViewLog = require('../models/ViewLog');
        const Movie = require('../models/Movie');

        // Log view
        await ViewLog.create({
            userId,
            movieSlug,
            episodeSlug
        });

        // Update total view count
        await Movie.updateOne({ slug: movieSlug }, { $inc: { view: 1 } });

        // Cache view for 1 hour to prevent F5 spam
        viewCache.set(viewCacheKey, true, 3600);

        res.json({ success: true, message: 'View tracked completely' });
    } catch (error) {
        console.error('Track view error:', error);
        // Fail silently to client
        res.json({ success: false });
    }
};

