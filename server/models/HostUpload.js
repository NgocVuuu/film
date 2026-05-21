const mongoose = require('mongoose');

const HostUploadSchema = new mongoose.Schema({
  series: String,
  season: String,
  episode: String,
  tmdbId: String,
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  videoId: String,
  sourcePage: String,
  sourceDirectUrl: String,
  filename: String,
  host: String,
  taskId: String,
  status: { type: String, default: 'pending' }, // pending, processing, completed, failed, unsupported
  notes: String,
  contentHash: String,
  contentLength: Number,
  duration: Number,
  retries: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  sourceMetadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

HostUploadSchema.index({ series: 1, season: 1, episode: 1, host: 1 }, { unique: false });

module.exports = mongoose.model('HostUpload', HostUploadSchema);
