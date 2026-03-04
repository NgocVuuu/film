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

// [Nhận Heartbeat từ Nginx Node]
exports.receiveHeartbeat = async (req, res) => {
    try {
        // Simple authentication using a shared secret from .env
        const authHeader = req.headers.authorization;
        const secret = process.env.NGINX_JWT_SECRET || 'YOUR_ADMIN_SECRET_OR_JWT_TOKEN';

        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== secret) {
            return res.status(401).json({ success: false, message: 'Unauthorized Heartbeat' });
        }

        const { nodeId, cpu, ram, activeConnections } = req.body;

        if (!nodeId) {
            return res.status(400).json({ success: false, message: 'Missing nodeId' });
        }

        // Tạm thời dùng Name để map. Admin cần cấu hình NODE_ID trong bash script khớp với name trong DB
        // Hoặc có thể map bằng Domain nếu truyền domain.
        const node = await ServerNode.findOneAndUpdate(
            { name: nodeId },
            {
                $set: {
                    'metrics.cpu': cpu,
                    'metrics.ram': ram,
                    'metrics.activeConnections': activeConnections,
                    'metrics.lastHeartbeat': new Date()
                }
            },
            { new: true }
        );

        if (!node) {
            // Log nhưng không báo lỗi 404 để bash script không bị rối
            console.warn(`[Heartbeat] Nhận tín hiệu từ Node vô danh: ${nodeId}`);
            return res.json({ success: true, message: 'Node unfound but heartbeat acknowledged' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Heartbeat] Lỗi khi nhận nhịp tim:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
