const mongoose = require('mongoose');

const suggestedMovieSchema = new mongoose.Schema({
    mkvdrama_id: { 
        type: String, 
        required: true,
        unique: true 
    },
    english_name: { 
        type: String, 
        required: true 
    },
    thumb_url: { 
        type: String 
    },
    status: { 
        type: String,
        enum: ['Ongoing', 'Completed'],
        default: 'Ongoing'
    },
    in_pchill_db: { 
        type: Boolean, 
        default: false 
    },
    pchill_movie_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Movie',
        default: null
    },
    release_days: [{ 
        type: String 
    }],
    last_checked: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SuggestedMovie', suggestedMovieSchema);
