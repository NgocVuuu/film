const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieSlug: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000 // Increased limit
    },
    rating: {
        type: Number,
        min: 1,
        max: 10,
        required: false // Made optional
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null,
        index: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
commentSchema.index({ movieSlug: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
