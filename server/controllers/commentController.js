const Comment = require('../models/Comment');
const Movie = require('../models/Movie');

// 1. Get Comments for a Movie
const getComments = async (req, res) => {
    try {
        const { slug } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Increased limit
        const skip = (page - 1) * limit;

        // Fetch top-level comments (parentId: null) first? 
        // Or fetch all and let frontend arrange? 
        // For pagination of threads, best to fetch top-level.

        const filter = { movieSlug: slug, parentId: null };

        const comments = await Comment.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'displayName avatar role')
            .lean();

        // For each comment, fetch replies
        // This is the N+1 problem, but good for simple nested structure. 
        // Limit replies? 
        const commentIds = comments.map(c => c._id);
        const replies = await Comment.find({ parentId: { $in: commentIds } })
            .sort({ createdAt: 1 })
            .populate('user', 'displayName avatar role')
            .lean();

        // Attach replies to comments
        const commentsWithReplies = comments.map(comment => {
            comment.replies = replies.filter(r => r.parentId.toString() === comment._id.toString());
            return comment;
        });

        const total = await Comment.countDocuments(filter);

        res.json({
            success: true,
            data: commentsWithReplies,
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

// 2. Add Comment (or Reply)
const addComment = async (req, res) => {
    try {
        const { movieSlug, content, rating, parentId } = req.body;
        const userId = req.user._id;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung.' });
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 10)) {
            return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 10.' });
        }

        // Validate parentId if provided
        if (parentId) {
            const parentComment = await Comment.findById(parentId);
            if (!parentComment) {
                return res.status(404).json({ success: false, message: 'Bình luận gốc không tồn tại.' });
            }
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
            rating: rating || undefined,
            parentId: parentId || null
        });
        await newComment.save();

        // Update Movie Rating ONLY if rating is provided
        if (rating) {
            const stats = await Comment.aggregate([
                { $match: { movieSlug: movieSlug, rating: { $exists: true, $ne: null } } },
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
                await movie.save();
            }
        }

        // Return the new comment with populated user
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'displayName avatar role');

        res.status(201).json({ success: true, data: populatedComment });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Delete Comment
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

        // Delete comment and its replies
        await Comment.deleteMany({ $or: [{ _id: id }, { parentId: id }] });

        // Recalculate Rating if it had a rating
        if (comment.rating) {
            const movie = await Movie.findOne({ slug: movieSlug });
            if (movie) {
                const stats = await Comment.aggregate([
                    { $match: { movieSlug: movieSlug, rating: { $exists: true, $ne: null } } },
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
        }

        res.json({ success: true, message: 'Đã xóa bình luận.' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Like/Unlike Comment
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Bình luận không tồn tại.' });
        }

        const isLiked = comment.likes.includes(userId);

        if (isLiked) {
            comment.likes.pull(userId);
        } else {
            comment.likes.push(userId);
        }

        await comment.save();
        res.json({ success: true, likes: comment.likes });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getComments,
    addComment,
    deleteComment,
    toggleLike
};
