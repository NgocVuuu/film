const mongoose = require('mongoose');

const movieReactionSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['fire', 'trash'],
        required: true
    }
}, {
    timestamps: true
});

// Prevent duplicate reactions
movieReactionSchema.index({ user: 1, movieSlug: 1 }, { unique: true });

// Ensure a user can only have one reaction per movie
movieReactionSchema.index({ user: 1, movieSlug: 1 }, { unique: true });

module.exports = mongoose.model('MovieReaction', movieReactionSchema);
