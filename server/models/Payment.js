const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'VND'
    },
    provider: {
        type: String,
        enum: ['vnpay', 'sepay'],
        default: 'sepay'
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    code: { // Transaction content code (e.g. PCHILL ABC123)
        type: String,
        index: true
    },
    vnpTxnRef: String, // VNPay transaction reference
    vnpResponseCode: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    subscriptionTier: {
        type: String,
        default: 'premium'
    },
    subscriptionDuration: {
        type: Number,
        default: 1 // months
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ code: 1 }); // Index for webhook lookup

module.exports = mongoose.model('Payment', paymentSchema);
