const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // Auto-delete after 90 days
  }
});

// Index for querying subscriptions by user
pushSubscriptionSchema.index({ userId: 1, createdAt: -1 });

// Method to cleanup expired or invalid subscriptions
pushSubscriptionSchema.statics.cleanupInvalid = async function() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
  
  const result = await this.deleteMany({
    createdAt: { $lt: ninetyDaysAgo }
  });
  
  return result.deletedCount;
};

// Method to get all subscriptions for a user
pushSubscriptionSchema.statics.getByUserId = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
