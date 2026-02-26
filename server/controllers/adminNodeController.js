const ServerNode = require('../models/ServerNode');

// [Lấy danh sách Nodes]
exports.getAllNodes = async (req, res) => {
    try {
        const nodes = await ServerNode.find().sort('-createdAt');
        res.json({ success: true, data: nodes });
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// [Tạo mới Node]
exports.createNode = async (req, res) => {
    try {
        const { name, domain, status, apiKeys } = req.body;
        const newNode = await ServerNode.create({
            name,
            domain,
            status: status || 'active',
            apiKeys: apiKeys || []
        });
        res.status(201).json({ success: true, data: newNode });
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// [Cập nhật Node]
exports.updateNode = async (req, res) => {
    try {
        const { id } = req.params;
        const node = await ServerNode.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

        if (!node) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy Node' });
        }
        res.json({ success: true, data: node });
    } catch (error) {
        console.error('Error updating node:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// [Xóa Node]
exports.deleteNode = async (req, res) => {
    try {
        const { id } = req.params;
        const node = await ServerNode.findByIdAndDelete(id);

        if (!node) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy Node' });
        }
        res.json({ success: true, message: 'Đã xóa Node thành công' });
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
