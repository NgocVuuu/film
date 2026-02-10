const mongoose = require('mongoose');

const movieRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieName: {
        type: String,
        required: true
    },
    movieSlug: String,
    ophimUrl: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    priority: {
        type: Number,
        default: 0 // Higher = more priority
    },
    requestCount: {
        type: Number,
        default: 1 // Track how many users requested this
    },
    processedAt: Date,
    errorMessage: String
}, {
    timestamps: true
});

// Index for faster queries
movieRequestSchema.index({ userId: 1, createdAt: -1 });
movieRequestSchema.index({ status: 1, priority: -1 });
movieRequestSchema.index({ movieSlug: 1 });

module.exports = mongoose.model('MovieRequest', movieRequestSchema);
