const axios = require('axios');

class RealDebridService {
    constructor() {
        this.apiKey = process.env.REAL_DEBRID_API_KEY;
        this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
    }

    async apiRequest(method, endpoint, data = null) {
        if (!this.apiKey) {
            throw new Error('REAL_DEBRID_API_KEY is not configured');
        }

        try {
            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
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

    async addMagnet(magnet) {
        return this.apiRequest('POST', '/torrents/addMagnet', { magnet });
    }

    async selectFiles(torrentId, fileId = 'all') {
        return this.apiRequest('POST', `/torrents/selectFiles/${torrentId}`, { files: fileId });
    }

    async getTorrentInfo(torrentId) {
        return this.apiRequest('GET', `/torrents/info/${torrentId}`);
    }

    async unrestrictLink(link) {
        return this.apiRequest('POST', '/unrestrict/link', { link });
    }

    /**
     * Complete workflow to get a streamable link from a magnet
     */
    async getStreamLink(magnet) {
        try {
            // 1. Add magnet
            const addResult = await this.addMagnet(magnet);
            const torrentId = addResult.id;

            // 2. Select files (default all)
            await this.selectFiles(torrentId);

            // 3. Wait/Get Info
            let info = await this.getTorrentInfo(torrentId);

            // If it's already cached/downloaded, it might have links immediately
            // If not, we might need to wait, but usually RD caches are instant for popular movies
            if (info.links && info.links.length > 0) {
                // Return the first link restricted (usually we want the largest file, 
                // but let's take the first for now which is often the main movie)
                const rdLink = info.links[0];
                const unrestrictResult = await this.unrestrictLink(rdLink);
                return unrestrictResult.download;
            }

            throw new Error('Torrent is still downloading or no links found');
        } catch (error) {
            console.error('Real-Debrid workflow error:', error.message);
            throw error;
        }
    }
}

module.exports = new RealDebridService();
