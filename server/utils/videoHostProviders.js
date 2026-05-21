const axios = require('axios');

class PremiumHostService {
    constructor(hostName, baseUrl, apiKey) {
        this.hostName = hostName;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'api-token': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Start a Remote Upload task
     * @param {string} videoUrl Direct link to MKV/MP4 file
     * @param {string} title Title of the video
     * @param {string} folderId Optional folder ID to upload into
     * @returns {string} Task ID
     */
    async remoteUpload(videoUrl, title, folderId = null) {
        try {
            console.log(`[${this.hostName}] Starting remote upload for: ${title} (Folder: ${folderId || 'root'})`);
            const payload = {
                url: videoUrl,
                name: title
            };
            if (folderId) payload.folderId = folderId;
            
            const response = await this.client.post('/api/v1/video/advance-upload', payload);
            console.log(`[${this.hostName}] Remote upload HTTP ${response.status}`);
            // Expected response contains the task ID
            if (response.data && response.data.id) {
                console.log(`[${this.hostName}] Upload task created: ${response.data.id}`);
                return response.data.id;
            } else if (response.data && response.data.data && response.data.data.id) {
                 console.log(`[${this.hostName}] Upload task created (nested): ${response.data.data.id}`);
                 return response.data.data.id;
            }
            console.log(`[${this.hostName}] Unexpected response body:`, response.data);
            throw new Error('Invalid response structure');
        } catch (error) {
            console.error(`[${this.hostName}] Remote Upload Error:`, {
                message: error.message,
                status: error.response?.status,
                body: error.response?.data,
                headers: error.response?.headers
            });
            throw error;
        }
    }

    /**
     * Check the status of an upload task
     * @param {string} taskId Task ID returned from remoteUpload
     * @returns {Object} { status: 'pending'|'completed'|'error', videoId: '...' }
     */
    async checkUploadStatus(taskId) {
        try {
            const response = await this.client.get(`/api/v1/video/advance-upload/${taskId}`);
            const data = response.data.data || response.data;
            
            // Statuses depend on the platform, assuming 'completed', 'processing', 'pending', 'error'
            const status = (data.status || '').toLowerCase();
            
            const videoIdFromArray = Array.isArray(data.videos)
                ? (typeof data.videos[0] === 'string' ? data.videos[0] : data.videos[0]?.id)
                : null;
            const resolvedVideoId = data.videoId || videoIdFromArray || null;

            if (status === 'completed' || status === 'success' || resolvedVideoId) {
                return { status: 'completed', videoId: resolvedVideoId };
            } else if (status === 'error' || status === 'failed') {
                return { status: 'error', error: data.error_message || 'Upload failed' };
            }
            
            return { status: 'pending' };
            
        } catch (error) {
            console.error(`[${this.hostName}] Status Check Error:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get Embed URL
     */
    getEmbedUrl(videoId, allowedDomain = 'pchill.com') {
        return `${this.baseUrl}/embed/${videoId}?api=${allowedDomain}`;
    }

    /**
     * Create a player on the host
     * @param {string} domain - custom domain or subdomain for the player (e.g. embed.pchill.online)
     * @returns {string|null} playerId
     */
    async createPlayer(domain) {
        try {
            const resp = await this.client.post('/api/v1/video/player', { domain });
            if (resp && (resp.status === 201 || resp.status === 200)) {
                return resp.data?.id || resp.data?.data?.id || null;
            }
            return null;
        } catch (e) {
            console.error(`[${this.hostName}] createPlayer error:`, e.response?.data || e.message);
            return null;
        }
    }

    /**
     * Find a player by domain (returns player id or null)
     * @param {string} domain
     */
    async findPlayerByDomain(domain) {
        try {
            const resp = await this.client.get('/api/v1/video/player', { params: { search: domain } });
            const items = resp.data?.data || resp.data || [];
            if (Array.isArray(items)) {
                const found = items.find(i => i.domain === domain || i.domain === `https://${domain}` || (i.configuration && i.configuration.domain === domain));
                return found?.id || null;
            }
            return null;
        } catch (e) {
            console.error(`[${this.hostName}] findPlayerByDomain error:`, e.response?.data || e.message);
            return null;
        }
    }

    /**
     * Update player configuration
     * @param {string} playerId
     * @param {Object} config - partial config (see host docs)
     * @returns {boolean}
     */
    async updatePlayer(playerId, config) {
        try {
            const resp = await this.client.patch(`/api/v1/video/player/${playerId}`, config);
            return resp.status === 204 || resp.status === 200;
        } catch (e) {
            console.error(`[${this.hostName}] updatePlayer error:`, e.response?.data || e.message);
            return false;
        }
    }

    /**
     * Create an ad for a player
     * @param {string} playerId
     * @param {Object} adPayload - { format, provider, status, content, zoneId, apiToken, startTime }
     * @returns {string|null} adId
     */
    async createPlayerAd(playerId, adPayload) {
        try {
            const resp = await this.client.post(`/api/v1/video/player/${playerId}/ads`, adPayload);
            if (resp && (resp.status === 201 || resp.status === 200)) {
                return resp.data?.id || resp.data?.data?.id || null;
            }
            return null;
        } catch (e) {
            console.error(`[${this.hostName}] createPlayerAd error:`, e.response?.data || e.message);
            return null;
        }
    }

    /**
     * Rename uploaded video by videoId
     * @param {string} videoId
     * @param {string} name
     */
    async renameVideo(videoId, name) {
        try {
            if (!videoId || !name) return false;
            const resp = await this.client.patch(`/api/v1/video/manage/${videoId}`, { name });
            return resp.status === 204 || resp.status === 200;
        } catch (e) {
            console.error(`[${this.hostName}] renameVideo error:`, e.response?.data || e.message);
            return false;
        }
    }
}

// Cấu hình linh hoạt từ biến môi trường
const play4meAPI = process.env.PLAY4ME_API_KEY 
    ? new PremiumHostService('Play4Me', 'https://player4me.com', process.env.PLAY4ME_API_KEY) 
    : null;

const seekStreamingAPI = process.env.SEEKSTREAMING_API_KEY 
    ? new PremiumHostService('SeekStreaming', 'https://seekstreaming.com', process.env.SEEKSTREAMING_API_KEY) 
    : null;

module.exports = {
    PremiumHostService,
    play4meAPI,
    seekStreamingAPI
};

// Add generic helpers for folder operations (hosts can override or these will try common endpoints)
PremiumHostService.prototype.createFolder = async function(folderName) {
    try {
        console.log(`[${this.hostName}] createFolder: ${folderName}`);
        if (!folderName) return null;

        // 1) find existing folder by name first
        const listRes = await this.client.get('/api/v1/video/folder').catch(()=>null);
        const folders = listRes?.data || [];
        if (Array.isArray(folders)) {
            const existing = folders.find(f => (f.name || '').toLowerCase() === folderName.toLowerCase());
            if (existing?.id) return existing.id;
        }

        // 2) create folder with official endpoint
        const res = await this.client.post('/api/v1/video/folder', {
            name: folderName,
            description: `${this.hostName} auto folder`
        }).catch(()=>null);
        if (res && res.data && (res.data.id || res.data.data?.id)) return res.data.id || res.data.data.id;

        // fallback: some hosts still expose older path
        const res2 = await this.client.post('/api/v1/folder', { name: folderName }).catch(()=>null);
        if (res2 && res2.data && (res2.data.id || res2.data.data?.id)) return res2.data.id || res2.data.data.id;
        return null;
    } catch (e) {
        console.log(`[${this.hostName}] createFolder error:`, e.message);
        return null;
    }
}

PremiumHostService.prototype.assignToFolder = async function(videoId, folderId) {
    try {
        console.log(`[${this.hostName}] assignToFolder: video=${videoId} folder=${folderId}`);
        if (!videoId || !folderId) return false;

        // Official endpoint from OpenAPI
        const tryOfficial = await this.client.post(`/api/v1/video/folder/${folderId}/link`, { videoId }).catch(()=>null);
        if (tryOfficial && tryOfficial.status >= 200 && tryOfficial.status < 300) return true;

        // Fallback endpoints (best-effort)
        const try1 = await this.client.post(`/api/v1/folder/${folderId}/add`, { videoId }).catch(()=>null);
        if (try1 && try1.status >= 200 && try1.status < 300) return true;
        // Example: POST /api/v1/video/assign-folder
        const try2 = await this.client.post('/api/v1/video/assign-folder', { videoId, folderId }).catch(()=>null);
        if (try2 && try2.status >= 200 && try2.status < 300) return true;
        // Some hosts need /api/v1/video/{videoId}/move
        const try3 = await this.client.post(`/api/v1/video/${videoId}/move`, { folderId }).catch(()=>null);
        if (try3 && try3.status >= 200 && try3.status < 300) return true;
        return false;
    } catch (e) {
        console.log(`[${this.hostName}] assignToFolder error:`, e.message);
        return false;
    }
}
