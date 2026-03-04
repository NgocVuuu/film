const axios = require('axios');
const ServerNode = require('../models/ServerNode');
// Tùy chọn: Sử dụng node-cron để quản lý job chuyên nghiệp, hoặc dùng setInterval
// const cron = require('node-cron');

class HealthCheckService {
    constructor() {
        this.intervalTime = 30000; // 30 giây chạy 1 lần
        this.timeout = 3000;       // Quá 3 giây không Ping được quy là Đứt
        this.timer = null;
    }

    start() {
        console.log(`[HealthCheck] Khởi động Dịch vụ Giám sát Nginx Nodes (Mỗi ${this.intervalTime / 1000}s)`);
        this.pingNodes(); // Chạy ngay lần đầu
        this.timer = setInterval(() => this.pingNodes(), this.intervalTime);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            console.log('[HealthCheck] Đã dừng Dịch vụ Giám sát.');
        }
    }

    async pingNodes() {
        try {
            // Chỉ lấy các Node đang Active hoặc Offline. Maintenance thì bỏ qua không đụng vào.
            const nodes = await ServerNode.find({ status: { $in: ['active', 'offline'] } });

            if (!nodes || nodes.length === 0) return;

            for (const node of nodes) {
                this.checkSingleNode(node);
            }
        } catch (error) {
            console.error('[HealthCheck] Lỗi khi truy vấn danh sách Node:', error.message);
        }
    }

    async checkSingleNode(node) {
        const pingUrl = `${node.domain}/health`;
        const wasActive = node.status === 'active';
        let isHealthy = false;

        try {
            // Cố gắng Ping tới Nginx
            const response = await axios.get(pingUrl, { timeout: this.timeout });
            if (response.status === 200) {
                isHealthy = true;
            }
        } catch (error) {
            // Lỗi Timeout, Mạng rớt đài, OOM (Sập Nginx từ chối kết nối), DNS lỗi, v.v
            isHealthy = false;
        }

        // Logic tự động đảo trạng thái bảo vệ hệ thống
        if (isHealthy && !wasActive) {
            // Node đã được sửa / Nginx sống lại -> Trả lại thẻ Active chia tải
            console.log(`[HealthCheck] 🟢 Node ${node.name} (${node.domain}) ĐÃ HỒI PHỤC. Chuyển trạng thái sang ACTIVE.`);
            node.status = 'active';
            await node.save();
        } else if (!isHealthy && wasActive) {
            // Phát hiện Đứt cáp / OOM / Sập -> Đá khỏi hàng ngũ Load Balancer ngay!
            console.warn(`[HealthCheck] 🔴 CẢNH BÁO: Node ${node.name} (${node.domain}) SẬP / TIMEOUT. Đã Gạch tên sang OFFLINE!`);
            node.status = 'offline';
            await node.save();
        }
    }
}

module.exports = new HealthCheckService();
