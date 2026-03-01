const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieSlug: {
        type: String,
        required: true
    },
    movieName: String,
    episodeSlug: String,
    episodeName: String,
    serverName: String,
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'fixed', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
