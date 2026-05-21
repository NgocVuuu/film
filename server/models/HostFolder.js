const mongoose = require('mongoose');

const HostFolderSchema = new mongoose.Schema({
  host: { type: String, required: true },
  series: { type: String },
  season: { type: String },
  folderId: { type: String, required: true },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

HostFolderSchema.index({ host: 1, series: 1, season: 1 }, { unique: true });

module.exports = mongoose.model('HostFolder', HostFolderSchema);
