const User = require('../models/User');
const debridManager = require('../utils/debridManager');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ServerNode = require('../models/ServerNode'); // Import Data Động
const Movie = require('../models/Movie'); // [BẢO MẬT L6] Import Model Phim để đối chiếu Magnet
const NodeCache = require('node-cache');

// Cache lưu trữ số lượng Magnet đã Request của mỗi User trong 24h (86400s)
const userMagnetCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// [BẢO MẬT CẤP ĐỘ 5] Chống Weaponized Fallback DoS: Rate Limit (3 lần / 5 phút)
const fallbackCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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

        // [BẢO MẬT CẤP ĐỘ 6] VÁ LỖ HỔNG ÁM SÁT MAGNET (ToS ASSASSINATION)
        // Kiểm tra xem Magnet này có thực sự nằm trong kho dữ liệu của pChill không
        // Phải truy vấn Database gốc để chặn Hacker tiêm Magnet rác/Honeypot vào.
        const validMovie = await Movie.findOne({ "torrents.magnet": magnet }).select('_id name');
        if (!validMovie) {
            console.warn(`[SECURITY ALERT] LỖ HỔNG LEVEL 6 BỊ CHẶN: User ${userId} cố tình request Magnet trái phép/ngoài hệ thống: ${magnet}`);
            return res.status(403).json({
                success: false,
                message: 'Hệ thống Từ Chối: Magnet Link không hợp lệ hoặc không có trong cơ sở dữ liệu của chúng tôi!'
            });
        }

        // [BẢO MẬT CẤP ĐỘ 6] VÁ LỖ HỔNG BÀO MÒN BĂNG THÔNG (Slow-Drip Quota Drain)
        // Thay vì chỉ đếm số lượng phim độc lập (Dễ lách bằng cách xem 1 phim 24/7),
        // Áp dụng Quota Dư Xài Cấp Token: Tối đa 100 lượt xin Link (Thỏa sức cày 2 bộ Drama mỗi ngày).
        // Vượt quá 100 lượt mới báo lỗi (Chỉ có Tool Auto Downloader / IDM Crawl mới chạm mốc này).
        const playCountKey = `user_total_plays_${userId}`;
        let totalPlays = userMagnetCache.get(playCountKey) || 0;

        if (totalPlays >= 100) {
            console.warn(`[Bandwidth Quota] Lưới Lọc FUP: User ${userId} đã Request luồng m3u8 ${totalPlays} lần trong ngày. Khóa hành vi Crawl!`);
            return res.status(429).json({
                success: false,
                message: 'Vượt Giới Hạn FUP (Hành vi Bất thường): Bạn đã bật quá 100 tập phim trong 24 giờ qua. Để chống hành vi dùng Tool lưu trữ phim phi pháp, hệ thống xin phép tạm khóa tài khoản của bạn đến ngày mai!'
            });
        }
        userMagnetCache.set(playCountKey, totalPlays + 1);

        // Lấy IP của Client (Trình duyệt người dùng)
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Cấu hình Nginx Proxy
        const nginxJwtSecret = process.env.NGINX_JWT_SECRET;
        const isCastMode = req.query.cast === 'true';

        // 1. CHỌN NODE NGINX ĐỘNG TỪ MONGODB (Dynamic Nodes - Least Load Balancer)
        let proxyUrls = [];
        let proxyIndex = 0;
        let nginxProxyUrl = '';
        let proxyNodeId = '';
        let selectedNode = null;

        if (nginxJwtSecret) {
            // Lấy danh sách Node đang "Active"
            const activeNodes = await ServerNode.find({ status: 'active' });

            if (activeNodes && activeNodes.length > 0) {
                // Sắp xếp Nodes theo số lượng Connection (Least Connection Algorithm)
                // Lọc bỏ các Node mất Heartbeat quá 45 giây (chết lâm sàng nhưng Admin chưa gạch tên)
                const now = new Date();
                const healthyNodes = activeNodes.filter(n => {
                    if (!n.metrics || !n.metrics.lastHeartbeat) return true; // Node mới chưa có heartbeat vẫn cho vào
                    const diffSeconds = (now - new Date(n.metrics.lastHeartbeat)) / 1000;
                    return diffSeconds <= 45;
                }).sort((a, b) => {
                    const connA = (a.metrics && a.metrics.activeConnections) ? a.metrics.activeConnections : 0;
                    const connB = (b.metrics && b.metrics.activeConnections) ? b.metrics.activeConnections : 0;
                    return connA - connB;
                });

                if (healthyNodes.length > 0) {
                    proxyUrls = healthyNodes.map(node => node.domain);

                    // Tìm Node khỏe nhất có API Key còn sống
                    for (let i = 0; i < healthyNodes.length; i++) {
                        const candidateNode = healthyNodes[i];
                        const candidateIndex = activeNodes.findIndex(n => n._id.toString() === candidateNode._id.toString());

                        const keyData = debridManager.getKeyForProxy(candidateIndex);
                        if (keyData && keyData.id !== deadKeyId) {
                            proxyIndex = candidateIndex;
                            selectedNode = candidateNode;
                            break;
                        }
                    }
                }
            } else if (process.env.NGINX_PROXY_URL) {
                // Backward Compatibility (Fallback về .env nếu MongoDB rỗng)
                proxyUrls = process.env.NGINX_PROXY_URL.split(',').map(url => url.trim()).filter(url => url.length > 0);

                // Thuật toán băm tĩnh nếu dùng Fallback
                let attempt = 0;
                while (attempt < proxyUrls.length) {
                    let candidateIndex = 0;
                    if (req.user && magnet) {
                        const hashString = req.user._id.toString() + magnet + (attempt > 0 ? attempt.toString() : '');
                        const hashInt = parseInt(crypto.createHash('md5').update(hashString).digest('hex').substring(0, 8), 16);
                        candidateIndex = hashInt % proxyUrls.length;
                    } else {
                        candidateIndex = (currentProxyIndex + attempt) % proxyUrls.length;
                    }

                    const keyData = debridManager.getKeyForProxy(candidateIndex);
                    if (keyData && keyData.id !== deadKeyId) {
                        proxyIndex = candidateIndex;
                        selectedNode = { domain: proxyUrls[proxyIndex] };
                        if (!req.user || !magnet) currentProxyIndex = candidateIndex + 1;
                        break;
                    }
                    attempt++;
                }
            }
        }

        if (!selectedNode) {
            return res.status(503).json({ success: false, message: 'Hệ thống Server Streaming đang quá tải và thiếu hụt API Key hoặc Node khỏe. Vui lòng thử lại sau.' });
        }

        nginxProxyUrl = proxyUrls.length > 0 ? (selectedNode.domain || proxyUrls[proxyIndex]) : '';
        proxyNodeId = `nginx_node_${proxyIndex + 1}`;

        // Kịch Bản Tác Chiến: BÓNG MA DPI (Nhà mạng chặn Tên miền)
        // Nếu phát hiện Client bị lỗi kết nối mạng (Network Error do DNS/DPI chặn)
        if (req.query.isNetworkError === 'true' && nginxProxyUrl) {
            // Đổi Tên miền Chính thành Tên miền Dự Phòng (Rotation)
            // Ví dụ: Đổi stream1.pchill.com thành s1-backup.pchill.net
            nginxProxyUrl = nginxProxyUrl.replace('stream', 's').replace('.com', '-backup.net');
            console.warn(`[DPI Evasion] Phát hiện nhà mạng chặn Domain. Đã kích hoạt tên miền dự phòng: ${nginxProxyUrl}`);
        }

        // 2. Call Debrid Manager service BẰNG Lõi API Key ĐỘC QUYỀN của Node Nginx đó & Mượn IP Nginx proxying
        // Manager sẽ tự lo việc Fallback sang AllDebrid/Premiumize nếu Real-Debrid sập
        const rdData = await debridManager.getStreamLink(magnet, proxyUrls.length > 0 ? proxyIndex : 0, nginxProxyUrl);

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
            const unrestrict = await debridManager.unrestrictLink(rdData._realKeyFallback, rdData.restrictedLink);
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
        if (error.message && (error.message.includes('PROXY_KEY_DEAD') || error.message.includes('ALL_PROXY_KEYS_DEAD'))) {
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
        if (error.message && error.message.includes('API_KEY is not configured')) {
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

        // [BẢO MẬT CẤP ĐỘ 5] - VÁ LỖ HỔNG: Weaponized Fallback DoS
        // Zero Trust Backend: Không tin tưởng 100% Client báo tử API Key. 
        // Phải Rate Limit hành vi báo tử này (Tối đa 3 lần / 5 phút).
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const identityKey = req.user ? req.user._id.toString() : clientIp;
        const cacheKey = `fallback_rate_${identityKey}`;
        let fallbackAttempts = fallbackCache.get(cacheKey) || 0;

        if (fallbackAttempts >= 3) {
            console.warn(`[SECURITY ALERT] LỖ HỔNG CẤP ĐỘ 5 BỊ CHẶN: Phát hiện User/IP ${identityKey} spam Fallback DoS cạn kiệt API Key.`);
            return res.status(429).json({
                success: false,
                message: 'Hệ thống tự vệ: Bạn đã yêu cầu chuyển máy chủ quá nhiều lần trong thời gian ngắn! Vui lòng thử lại sau 5 phút.'
            });
        }

        fallbackCache.set(cacheKey, fallbackAttempts + 1);

        // 1. Gạch tên API Key bị lỗi khỏi vòng quay trong 15 phút
        // Gọi qua DebridManager để nó tự nhận dạng Prefix (rd_ hay ad_)
        debridManager.markKeyAsDead(deadKeyId);

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
