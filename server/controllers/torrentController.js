const User = require('../models/User');
const realDebrid = require('../utils/realDebrid');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ServerNode = require('../models/ServerNode'); // Import Data Động
const NodeCache = require('node-cache');

// Cache lưu trữ số lượng Magnet đã Request của mỗi User trong 24h (86400s)
const userMagnetCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

let currentProxyIndex = 0;

/**
 * Get streaming link for a Torrent magnet
 */
exports.getStreamLink = async (req, res) => {
    try {
        const { magnet, deadKeyId } = req.query; // Nhận deadKeyId từ Fallback API
        const userId = req.user._id;

        if (!magnet) {
            return res.status(400).json({ success: false, message: 'Thiếu magnet link' });
        }

        const user = await User.findById(userId);
        if (!user || user.subscription?.tier !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'Chung tôi rất tiếc, tính năng này chỉ dành cho thành viên Premium'
            });
        }

        // [KỊCH BẢN BẢO MẬT] Anti DDoS Magnet: Rate Limiter (Max 20 lượt phim mới / ngày)
        const cacheKey = `user_magnets_${userId}`;
        let requestedMagnets = userMagnetCache.get(cacheKey) || [];

        if (!requestedMagnets.includes(magnet)) {
            if (requestedMagnets.length >= 20) {
                console.warn(`[Anti-DDoS] User ${userId} đã vượt ngưỡng 20 phim khác nhau/ngày.`);
                return res.status(429).json({
                    success: false,
                    message: 'Bạn đã xem đủ 20 bộ phim trong hôm nay. Để bảo vệ hệ thống, vui lòng quay lại vào ngày mai!'
                });
            }
            requestedMagnets.push(magnet);
            userMagnetCache.set(cacheKey, requestedMagnets);
        }

        // Lấy IP của Client (Trình duyệt người dùng)
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Cấu hình Nginx Proxy
        const nginxJwtSecret = process.env.NGINX_JWT_SECRET;
        const isCastMode = req.query.cast === 'true';

        // 1. CHỌN NODE NGINX ĐỘNG TỪ MONGODB (Dynamic Nodes - Tắc Kè Hoa)
        let proxyUrls = [];
        let proxyIndex = 0;
        let nginxProxyUrl = '';
        let proxyNodeId = '';

        if (nginxJwtSecret) {
            // Lấy danh sách Node đang "Active"
            const activeNodes = await ServerNode.find({ status: 'active' });

            if (activeNodes && activeNodes.length > 0) {
                proxyUrls = activeNodes.map(node => node.domain);
            } else if (process.env.NGINX_PROXY_URL) {
                // Backward Compatibility (Fallback về .env nếu MongoDB rỗng)
                proxyUrls = process.env.NGINX_PROXY_URL.split(',').map(url => url.trim()).filter(url => url.length > 0);
            }
        }

        if (proxyUrls.length > 0) {
            let attempt = 0;
            let foundAliveNode = false;

            while (attempt < proxyUrls.length) {
                let candidateIndex = 0;
                if (req.user && magnet) {
                    const hashString = req.user._id.toString() + magnet + (attempt > 0 ? attempt.toString() : '');
                    const hashInt = parseInt(crypto.createHash('md5').update(hashString).digest('hex').substring(0, 8), 16);
                    candidateIndex = hashInt % proxyUrls.length;
                } else {
                    candidateIndex = (currentProxyIndex + attempt) % proxyUrls.length;
                }

                // Lọc bỏ Node Nginx đang sở hữu Key bị chết (Tránh đi vào dải Fallback Loop)
                const keyData = realDebrid.getKeyForProxy(candidateIndex);
                if (keyData && keyData.id !== deadKeyId) {
                    proxyIndex = candidateIndex;
                    foundAliveNode = true;
                    if (!req.user || !magnet) currentProxyIndex = candidateIndex + 1;
                    break;
                }
                attempt++;
            }

            if (!foundAliveNode) {
                return res.status(503).json({ success: false, message: 'Hệ thống Server Streaming đang quá tải và thiếu hụt API Key. Vui lòng thử lại sau.' });
            }

            nginxProxyUrl = proxyUrls[proxyIndex];
            proxyNodeId = `nginx_node_${proxyIndex + 1}`;

            // Kịch Bản Tác Chiến: BÓNG MA DPI (Nhà mạng chặn Tên miền)
            // Nếu phát hiện Client bị lỗi kết nối mạng (Network Error do DNS/DPI chặn)
            if (req.query.isNetworkError === 'true' && nginxProxyUrl) {
                // Đổi Tên miền Chính thành Tên miền Dự Phòng (Rotation)
                // Ví dụ: Đổi stream1.pchill.com thành s1-backup.pchill.net
                nginxProxyUrl = nginxProxyUrl.replace('stream', 's').replace('.com', '-backup.net');
                console.warn(`[DPI Evasion] Phát hiện nhà mạng chặn Domain. Đã kích hoạt tên miền dự phòng: ${nginxProxyUrl}`);
            }
        }

        // 2. Call Real-Debrid service BẰNG Lõi API Key ĐỘC QUYỀN của Node Nginx đó & Mượn IP Nginx proxying
        const rdData = await realDebrid.getStreamLink(magnet, proxyUrls.length > 0 ? proxyIndex : 0, nginxProxyUrl);

        let finalStreamUrl = '';

        if (proxyUrls.length > 0) {
            // Generate a short-lived JWT chứa Restricted Link, MÃ API KEY (ID), và Client IP
            const token = jwt.sign(
                {
                    url: rdData.restrictedLink,
                    rd_key_id: rdData.keyId,
                    client_ip: clientIp,
                    is_cast: isCastMode,
                    user_id: req.user ? req.user._id.toString() : 'anonymous',
                    proxy_node: proxyNodeId // Khảm Load-Balancer Node ID vào JWT để Track
                },
                nginxJwtSecret,
                { expiresIn: isCastMode ? '60s' : '6h' } // Link gốc sống 6h, Link thủ tục Cast TV chết sau 60s
            );
            finalStreamUrl = `${nginxProxyUrl}/play?token=${token}`;
        }

        // Cứu cánh nếu chưa setup Nginx (Bị lỗi 403 nếu server Nginx không cùng IP với server Node.js)
        if (!finalStreamUrl) {
            const unrestrict = await realDebrid.unrestrictLink(rdData._realKeyFallback, rdData.restrictedLink);
            finalStreamUrl = unrestrict.download;
        }

        res.json({
            success: true,
            message: 'Đã chuẩn bị luồng Torrent thành công',
            data: {
                streamUrl: finalStreamUrl,
                keyId: rdData.keyId // Gửi kèm Key ID để Client báo lỗi nếu sập
            }
        });

    } catch (error) {
        console.error('Torrent stream error:', error);

        // Bắt lỗi Khả năng đáp ứng API Key
        if (error.message && error.message.includes('PROXY_KEY_DEAD')) {
            return res.status(503).json({
                success: false,
                message: 'Hệ thống Server Streaming đang dồn tải. Vui lòng thử lại sau vài phút.'
            });
        }

        // Bắt lỗi Torrent chưa Cache (Downloading Trap)
        if (error.isTorrentDownloading) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Specific error for missing API Key
        if (error.message && error.message.includes('REAL_DEBRID_API_KEY')) {
            return res.status(500).json({
                success: false,
                message: 'Hệ thống Torrent đang được bảo trì (API Key missing)'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi khi khởi tạo luồng Torrent. Có thể torrent này chưa được cache hoặc server quá tải.',
            error: error.message
        });
    }
};

// API Fallback Dead-Letter: Xử lý Lộ trình Mạng khi 1 API Key chết bất đắc kỳ tử hoặc Bị Nhà mạng chặn Domain (DPI)
exports.fallbackStreamLink = async (req, res) => {
    try {
        const { magnet, deadKeyId, isNetworkError } = req.query;
        if (!magnet || !deadKeyId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu magnet hoặc deadKeyId để tiến hành đổi Server/Key'
            });
        }

        // 1. Gạch tên API Key bị lỗi khỏi vòng quay trong 15 phút
        realDebrid.markKeyAsDead(deadKeyId);

        // Đánh dấu cờ Nếu lỗi do nhà mạng (DPI) để getStreamLink trả về Backup Domain
        if (isNetworkError === 'true' || isNetworkError === true) {
            req.query.isNetworkError = 'true';
            console.warn(`[TorrentController] Kích hoạt kịch bản Né DPI Nhà Mạng cho nam châm ${magnet.substring(0, 30)}...`);
        } else {
            console.warn(`[TorrentController] Đang tiến hành Fallback Reroute cho nam châm ${magnet.substring(0, 30)}... và loại bỏ ${deadKeyId}`);
        }

        // 2. Chuyển hướng Re-Route lại hàm getStreamLink bình thường
        return await exports.getStreamLink(req, res);
    } catch (error) {
        console.error('Fallback error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi Cứu mạng Fallback HLS.'
        });
    }
};
