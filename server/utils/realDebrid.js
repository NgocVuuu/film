const axios = require('axios');

class RealDebridService {
    constructor() {
        // Hỗ trợ nhiều API Key phân tách bằng dấu phẩy
        const keysEnv = process.env.REAL_DEBRID_API_KEY || '';
        this.apiKeys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
        this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
        this.currentIndex = 0;
        this.deadKeys = new Map(); // Lưu trữ Key ID bị báo lỗi (Dead Letter)
    }

    // Lấy API Key ép cứng 1:1 theo phiên bản Proxy Index (Chống Trùng IP RD ToS)
    getKeyForProxy(proxyIndex) {
        if (this.apiKeys.length === 0) return null;

        // Map cứng Proxy 0 -> Key 0, Proxy 1 -> Key 1
        // Nếu số Proxy > số Key, sẽ lặp lại Key, user cần cấu hình đủ Key
        const keyIndex = proxyIndex % this.apiKeys.length;
        const keyId = `rd_key_${keyIndex}`;

        // Kiểm tra xem Key này có đang bị đánh dấu là "Chết" không
        const deadUntil = this.deadKeys.get(keyId);
        if (deadUntil && Date.now() < deadUntil) {
            return null; // Key này chết, Proxy này coi như Tê liệt
        } else if (deadUntil) {
            this.deadKeys.delete(keyId);
        }

        return { key: this.apiKeys[keyIndex], id: keyId };
    }

    // Đánh dấu 1 Key ID là đã chết (Timeout phạt 15 phút)
    markKeyAsDead(keyId) {
        // Khóa API Key này trong 15 phút (900000 ms)
        console.warn(`[RealDebrid] Đóng băng API Key ${keyId} trong 15 phút do phát hiện lỗi 424 Domino`);
        this.deadKeys.set(keyId, Date.now() + 900000);
    }

    async apiRequest(method, endpoint, apiKey, data = null, proxyDomain = null) {
        if (!apiKey) {
            throw new Error('REAL_DEBRID_API_KEY is not configured');
        }

        try {
            // [KỊCH BẢN BẢO MẬT] IP Rotation: Nginx Forward Proxy
            // Chuyển hướng Traffic gọi API của Node.js sang Nginx (ẩn địa chỉ thực)
            let targetUrl = `${this.baseUrl}${endpoint}`;
            if (proxyDomain) {
                // Biến URL chuẩn: https://api.real-debrid.com/rest/1.0/torrents/addMagnet
                // Sang Endpoint Xuyên thủng: https://stream1.pchill.com/rd_proxy/rest/1.0/torrents/addMagnet
                targetUrl = targetUrl.replace('https://api.real-debrid.com', `${proxyDomain}/rd_proxy`);
            }

            const config = {
                method,
                url: targetUrl,
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            };

            if (data) {
                const params = new URLSearchParams();
                for (const key in data) {
                    params.append(key, data[key]);
                }
                config.data = params;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Real-Debrid API Error (${endpoint}):`, error.response?.data || error.message);
            throw error;
        }
    }

    async addMagnet(apiKey, magnetLink, proxyDomain = null) {
        return this.apiRequest('POST', '/torrents/addMagnet', apiKey, { magnet: magnetLink }, proxyDomain);
    }

    async selectFiles(apiKey, torrentId, files = 'all', proxyDomain = null) {
        return this.apiRequest('POST', `/torrents/selectFiles/${torrentId}`, apiKey, { files }, proxyDomain);
    }

    async getTorrentInfo(apiKey, torrentId, proxyDomain = null) {
        return this.apiRequest('GET', `/torrents/info/${torrentId}`, apiKey, null, proxyDomain);
    }

    async unrestrictLink(apiKey, link) {
        return this.apiRequest('POST', '/unrestrict/link', apiKey, { link });
    }

    /**
     * Complete workflow to get a streamable link from a magnet
     */
    async getStreamLink(magnet, proxyIndex, proxyDomain = null) {
        try {
            // Lấy API Key độc quyền tương ứng với Cluster Proxy cần Stream
            const current = this.getKeyForProxy(proxyIndex);

            if (!current) {
                // Key này đã bị đóng băng vì lỗi 424, Nginx này xem như rụng phuộc
                const keyError = new Error('PROXY_KEY_DEAD');
                keyError.code = 'PROXY_KEY_DEAD';
                throw keyError;
            }

            // 1. Add magnet
            const addResult = await this.addMagnet(current.key, magnet, proxyDomain);
            const torrentId = addResult.id;

            // 2. Select files
            await this.selectFiles(current.key, torrentId, 'all', proxyDomain);

            // 3. Wait/Get Info
            let info = await this.getTorrentInfo(current.key, torrentId, proxyDomain);

            // Bắt lỗi Phim chưa được kéo xong về máy chủ đám mây RD (Uncached Trap)
            if (info.status !== 'downloaded') {
                const customError = new Error(`Phim đang được máy chủ đám mây tải về (${info.progress || 0}%). Vui lòng quay lại sau ít phút!`);
                customError.isTorrentDownloading = true;
                throw customError;
            }

            // If it's already cached/downloaded...
            if (info.links && info.links.length > 0) {
                const rdLink = info.links[0];
                return { restrictedLink: rdLink, keyId: current.id, _realKeyFallback: current.key };
            }

            throw new Error('Không tìm thấy link Stream hợp lệ trong Torrent này');
        } catch (error) {
            console.error('Real-Debrid workflow error:', error.message);
            throw error;
        }
    }
}

module.exports = new RealDebridService();
