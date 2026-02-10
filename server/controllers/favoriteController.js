const Favorite = require('../models/Favorite');
const Movie = require('../models/Movie');

exports.addFavorite = async (req, res) => {
    try {
        const { slug, type = 'favorite' } = req.body;
        const userId = req.user._id;

        const movie = await Movie.findOne({ slug });
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Phim không tồn tại' });
        }

        const existing = await Favorite.findOne({ user: userId, movieSlug: slug, type });
        if (existing) {
            return res.status(200).json({ success: true, message: type === 'favorite' ? 'Phim đã có trong danh sách yêu thích' : 'Phim đã có trong danh sách xem sau' });
        }

        await Favorite.create({
            user: userId,
            movie: movie._id,
            movieSlug: slug,
            movieName: movie.name,
            thumbUrl: movie.thumb_url,
            type
        });

        res.status(201).json({ success: true, message: type === 'favorite' ? 'Đã thêm vào danh sách yêu thích' : 'Đã thêm vào danh sách xem sau' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const { slug } = req.params;
        const { type = 'favorite' } = req.query; // Use query for DELETE
        const userId = req.user._id;

        await Favorite.findOneAndDelete({ user: userId, movieSlug: slug, type });

        res.json({ success: true, message: 'Đã xóa khỏi danh sách' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkFavorite = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user ? req.user._id : null;

        if (!userId) return res.json({ success: true, isFavorite: false, isWatchLater: false });

        const favorite = await Favorite.findOne({ user: userId, movieSlug: slug, type: 'favorite' });
        const watchLater = await Favorite.findOne({ user: userId, movieSlug: slug, type: 'watch_later' });

        res.json({ success: true, isFavorite: !!favorite, isWatchLater: !!watchLater });
    } catch (err) {
        // Silent fail for check status
        res.json({ success: true, isFavorite: false, isWatchLater: false });
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || 'favorite';
        const skip = (page - 1) * limit;

        const favorites = await Favorite.find({ user: userId, type })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('movie', 'name slug thumb_url origin_name time quality lang year episode_current');

        const total = await Favorite.countDocuments({ user: userId, type });

        res.json({
            success: true,
            data: favorites,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.syncFavorites = async (req, res) => {
    try {
        const { items } = req.body; // Expect array of { slug, name, thumb_url, ... } or just slugs
        const userId = req.user._id;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Invalid data' });
        }

        let addedCount = 0;
        for (const item of items) {
            const slug = typeof item === 'string' ? item : item.slug;
            if (!slug) continue;

            // Find movie to get ID
            const movie = await Movie.findOne({ slug });
            if (!movie) continue; // Skip unknown movies

            const exists = await Favorite.findOne({ user: userId, movieSlug: slug, type: 'favorite' }); // Default sync is favorite
            if (!exists) {
                await Favorite.create({
                    user: userId,
                    movie: movie._id,
                    movieSlug: slug,
                    movieName: movie.name,
                    thumbUrl: movie.thumb_url,
                    type: 'favorite'
                });
                addedCount++;
            }
        }

        res.json({ success: true, message: `Đã đồng bộ ${addedCount} phim vào tài khoản`, addedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
