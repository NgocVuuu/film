const Comment = require('../models/Comment');
const User = require('../models/User');

// Get all comments (Admin)
exports.getAllComments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { movieSlug, isHidden } = req.query;

        let query = {};
        if (movieSlug) query.movieSlug = movieSlug;
        if (isHidden !== undefined) query.isHidden = isHidden === 'true';

        const comments = await Comment.find(query)
            .populate('user', 'displayName email avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Comment.countDocuments(query);

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
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete comment (Hard delete)
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findByIdAndDelete(commentId);

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        // Also delete all replies
        await Comment.deleteMany({ parentId: commentId });

        res.json({ success: true, message: 'Đã xóa bình luận' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle hide/unhide comment
exports.toggleHideComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        comment.isHidden = !comment.isHidden;
        await comment.save();

        res.json({
            success: true,
            message: comment.isHidden ? 'Đã ẩn bình luận' : 'Đã hiện bình luận',
            data: comment
        });
    } catch (error) {
        console.error('Toggle hide comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
