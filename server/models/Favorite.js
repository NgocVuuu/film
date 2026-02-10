const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    movieSlug: {
        type: String, // Redundant but useful for quick queries
        required: true
    },
    type: {
        type: String,
        enum: ['favorite', 'watch_later'],
        default: 'favorite'
    },
    // Cache some movie info to display even if movie deleted (optional, but good for listing)
    movieName: String,
    thumbUrl: String
}, {
    timestamps: true
});

favoriteSchema.index({ user: 1, movie: 1, type: 1 }, { unique: true });
favoriteSchema.index({ user: 1, movieSlug: 1 }); // Secondary check

module.exports = mongoose.model('Favorite', favoriteSchema);
