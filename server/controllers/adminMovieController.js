const Movie = require('../models/Movie');

// Get all movies (Admin - includes inactive)
exports.getAllMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const skip = (page - 1) * limit;

        const { search, type, status, isFeatured, isActive } = req.query;

        let query = {};
        if (search) query.$text = { $search: search };
        if (type) query.type = type;
        if (status) query.status = status;
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const movies = await Movie.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('name slug thumb_url type status view isFeatured isActive year episode_current');

        const total = await Movie.countDocuments(query);

        res.json({
            success: true,
            data: movies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all movies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single movie detail (Admin)
exports.getMovieDetail = async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        res.json({ success: true, data: movie });
    } catch (error) {
        console.error('Get movie detail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update movie info (Full update)
exports.updateMovie = async (req, res) => {
    try {
        const { slug } = req.params;
        const updates = req.body;

        // Allowed fields to update
        const allowedFields = [
            'name', 'origin_name', 'content', 'thumb_url', 'poster_url', 'trailer_url',
            'year', 'quality', 'lang', 'status', 'type', 'time', 'episode_current',
            'episode_total', 'notify', 'showtimes', 'is_copyright', 'sub_docquyen',
            'chieurap', 'actor', 'director', 'category', 'country', 'episodes'
        ];
        const filteredUpdates = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        const movie = await Movie.findOneAndUpdate(
            { slug },
            { ...filteredUpdates, updatedAt: Date.now() },
            { new: true }
        );

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        res.json({ success: true, message: 'Đã cập nhật thông tin phim', data: movie });
    } catch (error) {
        console.error('Update movie error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete movie (soft delete)
exports.deleteMovie = async (req, res) => {
    try {
        const { slug } = req.params;

        const movie = await Movie.findOneAndUpdate(
            { slug },
            { isActive: false },
            { new: true }
        );

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        res.json({ success: true, message: 'Đã xóa phim' });
    } catch (error) {
        console.error('Delete movie error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle featured flag
exports.toggleFeatured = async (req, res) => {
    try {
        const { slug } = req.params;

        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        movie.isFeatured = !movie.isFeatured;
        await movie.save();

        res.json({
            success: true,
            message: movie.isFeatured ? 'Đã đánh dấu nổi bật' : 'Đã bỏ đánh dấu nổi bật',
            data: movie
        });
    } catch (error) {
        console.error('Toggle featured error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
