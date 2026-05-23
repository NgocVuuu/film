const mongoose = require('mongoose');

const upgradeRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planId: {
        type: String,
        required: true
    },
    planName: {
        type: String,
        required: true
    },
    tier: {
        type: String,
        enum: ['premium', 'vip'],
        default: 'premium'
    },
    durationMonths: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    resolvedAt: {
        type: Date
    },
    note: {
        type: String // Admin note when approving/rejecting
    }
}, { timestamps: true });

module.exports = mongoose.model('UpgradeRequest', upgradeRequestSchema);
