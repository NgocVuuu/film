const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        sparse: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        sparse: true,
        unique: true,
        trim: true
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    discordId: {
        type: String,
        sparse: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        select: false // Do not return by default
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    avatar: {
        type: String,
        default: 'https://ui-avatars.com/api/?name=User&background=D4AF37&color=000'
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'guest'],
        default: 'user'
    },
    subscription: {
        tier: {
            type: String,
            enum: ['free', 'premium', 'vip'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'cancelled'],
            default: 'active'
        },
        startDate: Date,
        endDate: Date,
        autoRenew: {
            type: Boolean,
            default: false
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    lastLogin: Date,
    activeSessions: [{
        sessionId: String,
        deviceInfo: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes are created automatically by unique:true in the schema definition

module.exports = mongoose.model('User', userSchema);
