const mongoose = require('mongoose');

const ViewLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    movieSlug: {
        type: String,
        required: true,
        index: true
    },
    episodeSlug: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true // Index for fast date range queries
    }
});

// Compound index to help check for existing views quickly
// userId + movieSlug + episodeSlug + createdAt
ViewLogSchema.index({ userId: 1, movieSlug: 1, episodeSlug: 1, createdAt: -1 });

module.exports = mongoose.model('ViewLog', ViewLogSchema);
