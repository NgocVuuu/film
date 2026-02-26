const mongoose = require('mongoose');

const serverNodeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên Server Node (vd: Nginx Node 1)'],
        trim: true
    },
    domain: {
        type: String,
        required: [true, 'Vui lòng nhập tên miền (vd: https://stream1.pchill.com)'],
        trim: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'offline'],
        default: 'active'
    },
    apiKeys: [{
        type: String, // Danh sách các ID API Key của Real-Debrid cấp riêng cho Node này, ví dụ: 'rd_key_0', 'rd_key_1'
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ServerNode', serverNodeSchema);
