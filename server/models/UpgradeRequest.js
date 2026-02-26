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
    durationDays: {
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date
    }
});

module.exports = mongoose.model('UpgradeRequest', upgradeRequestSchema);
