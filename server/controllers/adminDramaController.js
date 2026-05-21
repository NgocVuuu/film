const MovieReaction = require('../models/MovieReaction');
const Movie = require('../models/Movie');

// 1. Get recent reactions (fire/trash votes)
exports.getAllReactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { search, type } = req.query;

        let query = {};
        if (type) {
            query.type = type;
        }

        if (search) {
            query.movieSlug = { $regex: search, $options: 'i' };
        }

        const reactions = await MovieReaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'displayName email avatar')
            .lean();

        const total = await MovieReaction.countDocuments(query);

        res.json({
            success: true,
            data: reactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all reactions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Delete a single reaction
exports.deleteReaction = async (req, res) => {
    try {
        const { id } = req.params;
        const reaction = await MovieReaction.findById(id);

        if (!reaction) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lượt vote này' });
        }

        const { movieSlug, type } = reaction;

        // Delete the reaction
        await reaction.deleteOne();

        // Recalculate or decrement the count on Movie
        const updateField = type === 'fire' ? 'fire_count' : 'trash_count';
        const movie = await Movie.findOne({ slug: movieSlug });
        if (movie) {
            movie[updateField] = Math.max(0, (movie[updateField] || 0) - 1);
            await movie.save();
        }

        res.json({ success: true, message: 'Đã xóa lượt vote thành công' });
    } catch (error) {
        console.error('Delete reaction error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get all movies with their fire/trash counts for ranking list management
exports.getDramaMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { search, sortBy } = req.query;

        let query = { isActive: { $ne: false } };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { origin_name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        let sort = { updatedAt: -1 };
        if (sortBy === 'fire') {
            sort = { fire_count: -1, updatedAt: -1 };
        } else if (sortBy === 'trash') {
            sort = { trash_count: -1, updatedAt: -1 };
        } else if (sortBy === 'total') {
            // Sort by sum of fire + trash (approximate with aggregation or sort by both)
            sort = { fire_count: -1, trash_count: -1 };
        }

        const movies = await Movie.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('name slug thumb_url fire_count trash_count year quality')
            .lean();

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
        console.error('Get drama movies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Directly override a movie's fire/trash counts
exports.updateDramaCounts = async (req, res) => {
    try {
        const { slug } = req.params;
        const { fire_count, trash_count } = req.body;

        const movie = await Movie.findOne({ slug });
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        if (fire_count !== undefined) {
            movie.fire_count = Math.max(0, parseInt(fire_count) || 0);
        }
        if (trash_count !== undefined) {
            movie.trash_count = Math.max(0, parseInt(trash_count) || 0);
        }

        await movie.save();

        res.json({
            success: true,
            message: 'Đã cập nhật lượt vote phim thành công',
            data: {
                slug: movie.slug,
                fire_count: movie.fire_count,
                trash_count: movie.trash_count
            }
        });
    } catch (error) {
        console.error('Update drama counts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
