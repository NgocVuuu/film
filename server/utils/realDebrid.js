const axios = require('axios');
const { sendTelegramAlert } = require('./telegramAlert');

class RealDebridService {
    constructor() {
        // Hỗ trợ nhiều API Key phân tách bằng dấu phẩy
        const keysEnv = process.env.REAL_DEBRID_API_KEY || '';
        this.apiKeys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
        this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
        this.currentIndex = 0;
        this.deadKeys = new Map(); // Lưu trữ Key ID bị báo lỗi (Dead Letter)
    }

    // Luân chuyển API Key tự động (Auto-Rotator)
    getKeyForProxy(proxyIndex) {
        if (this.apiKeys.length === 0) return null;

        // Bắt đầu tìm kiếm từ Key được gán mặc định cho Proxy này
        let startIndex = proxyIndex % this.apiKeys.length;

        for (let i = 0; i < this.apiKeys.length; i++) {
            const currentIndex = (startIndex + i) % this.apiKeys.length;
            const keyId = `rd_key_${currentIndex}`;
            const deadUntil = this.deadKeys.get(keyId);

            // Nếu Key còn sống, hoặc đã hết hạn phạt
            if (!deadUntil || Date.now() >= deadUntil) {
                if (deadUntil) {
                    console.log(`[RealDebrid] Ân xá cho API Key ${keyId}. Đưa trở lại Pool.`);
                    this.deadKeys.delete(keyId);
                }
                return { key: this.apiKeys[currentIndex], id: keyId };
            }
        }

        // Toàn bộ mạng lưới Real-Debrid Pool đã cháy
        return null;
    }

    // Đánh dấu 1 Key ID là đã chết (Phạt 6 tiếng nếu dính Ban 403)
    markKeyAsDead(keyId, reason = 'Unknown') {
        const penaltyTime = 6 * 60 * 60 * 1000; // 6 tiếng
        console.warn(`[RealDebrid] Đóng băng API Key ${keyId} trong 6 giờ. Lý do: ${reason}`);
        this.deadKeys.set(keyId, Date.now() + penaltyTime);

        // Bắt dòng thông báo ra Telegram
        sendTelegramAlert(`<b>🔥 QUẢ BOM SỐ 7 ĐÃ NỔ!</b>\n\nReal-Debrid API Key <code>${keyId}</code> đã bị tước quyền (Error: ${reason}).\nHệ thống đã tự động kích hoạt <b>Auto-Rotator</b> dời tải sang Key tiếp theo.\n\nVui lòng nạp thêm đạn (Key mới) vào <code>.env</code> nếu tình trạng này lặp lại!`);
    }

    async apiRequest(method, endpoint, apiKey, data = null, proxyDomain = null) {
        if (!apiKey) {
            throw new Error('REAL_DEBRID_API_KEY is not configured');
        }

        try {
            // [KỊCH BẢN BẢO MẬT] IP Rotation: Nginx Forward Proxy
            let targetUrl = `${this.baseUrl}${endpoint}`;
            if (proxyDomain) {
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
        const current = this.getKeyForProxy(proxyIndex);

        if (!current) {
            const keyError = new Error('PROXY_KEY_DEAD');
            keyError.code = 'PROXY_KEY_DEAD';
            throw keyError;
        }

        try {
            // 1. Add magnet
            const addResult = await this.addMagnet(current.key, magnet, proxyDomain);
            const torrentId = addResult.id;

            // 2. Select files
            await this.selectFiles(current.key, torrentId, 'all', proxyDomain);

            // 3. Wait/Get Info
            let info = await this.getTorrentInfo(current.key, torrentId, proxyDomain);

            if (info.status !== 'downloaded') {
                const customError = new Error(`Phim đang được máy chủ đám mây tải về (${info.progress || 0}%). Vui lòng quay lại sau ít phút!`);
                customError.isTorrentDownloading = true;
                throw customError;
            }

            if (info.links && info.links.length > 0) {
                const rdLink = info.links[0];
                return { restrictedLink: rdLink, keyId: current.id, _realKeyFallback: current.key };
            }

            throw new Error('Không tìm thấy link Stream hợp lệ trong Torrent này');

        } catch (error) {
            const status = error.response ? error.response.status : null;

            // Xử lý Lưới Tử: 401 (Hết hạn), 403 (Banned), 429 (Rate Limit)
            if (status === 401 || status === 403 || status === 429) {
                console.warn(`[RealDebrid] Phát hiện Lỗi Tử Huyệt ${status} trên Key ${current.id}`);
                this.markKeyAsDead(current.id, `HTTP ${status}`);

                // AUTO-ROTATOR: Gọi đệ quy lại hàm này. Vì Key cũ đã dán nhãn DEAD, 
                // `getKeyForProxy` ở trên cùng đệ quy sẽ tự bốc Key tiếp theo!
                console.log(`[RealDebrid] Auto-Rotator: Chuyển hướng Traffic sang Cứu viện...`);
                return this.getStreamLink(magnet, proxyIndex, proxyDomain);
            }

            console.error('Real-Debrid workflow error:', error.message);
            throw error;
        }
    }
}

module.exports = new RealDebridService();
