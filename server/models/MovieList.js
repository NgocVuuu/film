const mongoose = require('mongoose');
const slugify = require('slugify');

const movieListSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    slug: {
        type: String,
        unique: true
    },
    movies: [{
        movie: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index to ensure unique list names per user
movieListSchema.index({ user: 1, name: 1 }, { unique: true });

movieListSchema.pre('save', async function() {
    if (!this.isModified('name')) return;
    
    // Generate base slug
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    
    // Ensure uniqueness globally (or scoped to user if we want url like /u/user/list-slug)
    // For simplicity, let's make it somewhat unique with random string if collision, 
    // but ideally we want clean slugs. 
    // Since we handle lists within user context mostly, maybe simple slug is fine?
    // But if sharing, we need global unique slug or ID reference.
    // Let's toggle to using ID for lookup mostly, slug for pretty URL if needed.
    // For now, simple slugify.
    this.slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
});

module.exports = mongoose.model('MovieList', movieListSchema);
