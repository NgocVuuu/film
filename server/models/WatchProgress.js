const mongoose = require('mongoose');

const watchProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieId: {
        type: String,
        required: false  // Optional - movieSlug is the primary identifier
    },
    movieSlug: {
        type: String,
        required: true
    },
    movieName: String,
    movieThumb: String,
    episodeSlug: {
        type: String,
        required: true
    },
    episodeName: String,
    serverName: {
        type: String,
        required: true
    },
    currentTime: {
        type: Number,
        default: 0 // in seconds
    },
    duration: {
        type: Number,
        default: 0 // in seconds
    },
    completed: {
        type: Boolean,
        default: false
    },
    lastWatched: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for faster queries
watchProgressSchema.index({ userId: 1, movieSlug: 1, episodeSlug: 1 }, { unique: true });
watchProgressSchema.index({ userId: 1, lastWatched: -1 });

module.exports = mongoose.model('WatchProgress', watchProgressSchema);
