const axios = require('axios');

class AllDebridService {
    constructor() {
        // Hỗ trợ nhiều API Key phân tách bằng dấu phẩy
        const keysEnv = process.env.ALL_DEBRID_API_KEY || '';
        this.apiKeys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
        this.baseUrl = 'https://api.alldebrid.com/v4';
        this.agent = 'pChillApp'; // AllDebrid yêu cầu truyền Agent name
        this.deadKeys = new Map();
    }

    getKeyForProxy(proxyIndex) {
        if (this.apiKeys.length === 0) return null;

        const keyIndex = proxyIndex % this.apiKeys.length;
        const keyId = `ad_key_${keyIndex}`; // Prefix 'ad_'

        const deadUntil = this.deadKeys.get(keyId);
        if (deadUntil && Date.now() < deadUntil) {
            return null;
        } else if (deadUntil) {
            this.deadKeys.delete(keyId);
        }

        return { key: this.apiKeys[keyIndex], id: keyId };
    }

    markKeyAsDead(keyId) {
        console.warn(`[AllDebrid] Đóng băng API Key ${keyId} trong 15 phút.`);
        this.deadKeys.set(keyId, Date.now() + 900000);
    }

    async apiRequest(method, endpoint, apiKey, data = null) {
        if (!apiKey) {
            throw new Error('ALL_DEBRID_API_KEY is not configured');
        }

        try {
            let targetUrl = `${this.baseUrl}${endpoint}`;
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl = `${targetUrl}${separator}agent=${this.agent}&apikey=${apiKey}`;

            const config = {
                method,
                url: targetUrl,
                headers: {}
            };

            if (data && method.toUpperCase() === 'POST') {
                const params = new URLSearchParams();
                for (const key in data) {
                    params.append(key, data[key]);
                }
                config.data = params;
            }

            const response = await axios(config);

            if (response.data.status === 'error') {
                throw new Error(response.data.error.message || 'AllDebrid Error');
            }

            return response.data;
        } catch (error) {
            console.error(`AllDebrid API Error (${endpoint}):`, error.response?.data || error.message);
            throw error;
        }
    }

    async uploadMagnet(apiKey, magnetLink) {
        // Endpoint: /magnet/upload
        return this.apiRequest('POST', '/magnet/upload', apiKey, { magnets: [magnetLink] });
    }

    async getMagnetStatus(apiKey, magnetId) {
        // Endpoint: /magnet/status
        return this.apiRequest('GET', `/magnet/status?id=${magnetId}`, apiKey);
    }

    async unrestrictLink(apiKey, link) {
        // Endpoint: /link/unlock
        return this.apiRequest('GET', `/link/unlock?link=${encodeURIComponent(link)}`, apiKey);
    }

    /**
     * Complete workflow to get a streamable link from a magnet via AllDebrid
     */
    async getStreamLink(magnet, proxyIndex, proxyDomain = null) {
        try {
            const current = this.getKeyForProxy(proxyIndex);

            if (!current) {
                const keyError = new Error('PROXY_KEY_DEAD');
                keyError.code = 'PROXY_KEY_DEAD';
                throw keyError;
            }

            // 1. Check if magnet is instantly available (optional optimization: /magnet/instant)

            // 2. Upload magnet
            const uploadResult = await this.uploadMagnet(current.key, magnet);

            if (!uploadResult.data || !uploadResult.data.magnets || uploadResult.data.magnets.length === 0) {
                throw new Error('AllDebrid từ chối Magnet link');
            }

            const magnetData = uploadResult.data.magnets[0];
            const magnetId = magnetData.id;

            // 3. Check status
            const statusResult = await this.getMagnetStatus(current.key, magnetId);
            const statusInfo = statusResult.data.magnets;

            // Kiểm tra trạng thái tải
            if (statusInfo.status !== 'Ready') {
                const customError = new Error(`Phim đang được máy chủ AllDebrid tải về (Trạng thái: ${statusInfo.status}). Vui lòng quay lại sau!`);
                customError.isTorrentDownloading = true;
                throw customError;
            }

            // 4. Tìm link video lớn nhất (thường là file stream chính)
            if (statusInfo.links && statusInfo.links.length > 0) {
                // Ưu tiên file mkv, mp4
                const videoFiles = statusInfo.links.filter(f => f.filename.endsWith('.mkv') || f.filename.endsWith('.mp4'));

                let targetLink = '';
                if (videoFiles.length > 0) {
                    // Lấy file to nhất
                    videoFiles.sort((a, b) => b.size - a.size);
                    targetLink = videoFiles[0].link;
                } else {
                    targetLink = statusInfo.links[0].link;
                }

                return { restrictedLink: targetLink, keyId: current.id, _realKeyFallback: current.key };
            }

            throw new Error('Không tìm thấy link Stream hợp lệ trong Torrent này (AllDebrid)');
        } catch (error) {
            console.error('AllDebrid workflow error:', error.message);
            throw error;
        }
    }
}

module.exports = new AllDebridService();
