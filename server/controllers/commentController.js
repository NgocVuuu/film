const Comment = require('../models/Comment');
const Movie = require('../models/Movie');

// 1. Get Comments for a Movie
const getComments = async (req, res) => {
    try {
        const { slug } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ movieSlug: slug })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'displayName avatar role'); // Get user info

        const total = await Comment.countDocuments({ movieSlug: slug });

        res.json({
            success: true,
            data: comments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Add Comment
const addComment = async (req, res) => {
    try {
        const { movieSlug, content, rating } = req.body;
        const userId = req.user._id;

        if (!content || !rating) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung và đánh giá.' });
        }

        if (rating < 1 || rating > 10) {
            return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 10.' });
        }

        // Check if movie exists
        const movie = await Movie.findOne({ slug: movieSlug });
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Phim không tồn tại.' });
        }

        // Create Comment
        const newComment = new Comment({
            user: userId,
            movieSlug,
            content,
            rating
        });
        await newComment.save();

        // Update Movie Rating
        // Calculate new average
        // Using aggregation for accuracy or simplified incremental update
        // Let's us aggregation to be safe
        const stats = await Comment.aggregate([
            { $match: { movieSlug: movieSlug } },
            {
                $group: {
                    _id: '$movieSlug',
                    avgRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            movie.rating_average = Math.round(stats[0].avgRating * 10) / 10; // Round to 1 decimal
            movie.rating_count = stats[0].count;
            await movie.save();
        }

        // Return the new comment with populated user
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'displayName avatar role');

        res.status(201).json({ success: true, data: populatedComment });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Delete Comment (Admin or Owner)
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Bình luận không tồn tại.' });
        }

        // Check permission
        if (comment.user.toString() !== userId.toString() && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bình luận này.' });
        }

        const movieSlug = comment.movieSlug;
        await comment.deleteOne();

        // Recalculate Rating
        const movie = await Movie.findOne({ slug: movieSlug });
        if (movie) {
            const stats = await Comment.aggregate([
                { $match: { movieSlug: movieSlug } },
                {
                    $group: {
                        _id: '$movieSlug',
                        avgRating: { $avg: '$rating' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            if (stats.length > 0) {
                movie.rating_average = Math.round(stats[0].avgRating * 10) / 10;
                movie.rating_count = stats[0].count;
            } else {
                movie.rating_average = 0;
                movie.rating_count = 0;
            }
            await movie.save();
        }

        res.json({ success: true, message: 'Đã xóa bình luận.' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getComments,
    addComment,
    deleteComment
};
