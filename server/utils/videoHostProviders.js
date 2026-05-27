const axios = require('axios');

class PremiumHostService {
    constructor(hostName, baseUrl, apiKey, embedBaseUrl = null) {
        this.hostName = hostName;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.embedBaseUrl = embedBaseUrl;
        
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
        if (this.embedBaseUrl) {
            let baseUrl = this.embedBaseUrl;
            if (baseUrl.includes('#')) {
                return `${baseUrl}${videoId}`;
            } else {
                return `${baseUrl}/#${videoId}`;
            }
        }
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
    /**
     * Delete video by videoId
     * @param {string} videoId
     */
    async deleteVideo(videoId) {
        try {
            if (!videoId) return false;
            const resp = await this.client.delete(`/api/v1/video/manage/${videoId}`);
            return resp.status === 204 || resp.status === 200;
        } catch (e) {
            console.error(`[${this.hostName}] deleteVideo error:`, e.response?.data || e.message);
            return false;
        }
    }

    /**
     * Get billing balance
     * @returns {Object|null} balance info
     */
    async getBalance() {
        try {
            const resp = await this.client.get('/api/v1/billing/balance');
            return resp.data?.data || resp.data || null;
        } catch (e) {
            console.error(`[${this.hostName}] getBalance error:`, e.response?.data || e.message);
            return null;
        }
    }
}

class AbyssHostService {
    constructor(apiKey) {
        this.hostName = 'Abyss (VIP 1)'; // Đã đổi thành VIP 1
        this.apiKey = apiKey;
        this.jwtToken = null;
    }

    async getJwtToken() {
        if (this.jwtToken) return this.jwtToken;
        const email = process.env.ABYSS_EMAIL;
        const password = process.env.ABYSS_PASSWORD;
        if (!email || !password) throw new Error('Missing ABYSS_EMAIL or ABYSS_PASSWORD in .env');

        try {
            console.log(`[${this.hostName}] Đang đăng nhập vào hệ thống API của Abyss để lấy Token bảo mật...`);
            const response = await axios.post('https://api.abyss.to/v1/auth/login', { email, password });
            if (response.data && response.data.token) {
                this.jwtToken = response.data.token;
                console.log(`[${this.hostName}] Đăng nhập Abyss thành công. Đã lấy được JWT Token.`);
                return this.jwtToken;
            }
            throw new Error('Invalid login response');
        } catch (e) {
            console.error(`[${this.hostName}] Đăng nhập Abyss thất bại:`, e.response?.data || e.message);
            throw e;
        }
    }

    async uploadSubtitleFromVideo(videoUrl, slug, uploadId = null) {
        const { exec } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const HostUpload = require('../models/HostUpload');
        
        return new Promise(async (resolve) => {
            console.log(`[${this.hostName}] Đang quét các track phụ đề từ video gốc cho slug ${slug}...`);
            if (uploadId) {
                await HostUpload.findByIdAndUpdate(uploadId, { 
                    subtitleStatus: 'processing', 
                    subtitleLog: `Đang quét các track phụ đề từ video gốc...` 
                }).catch(() => {});
            }
            
            try {
                // Quét thông tin các track phụ đề
                const { stdout: probeOut } = await execPromise(`ffprobe -v error -show_entries stream=tags:stream=codec_name -select_streams s -of json "${videoUrl}"`);
                const probeData = JSON.parse(probeOut);
                const streams = probeData.streams || [];
                
                if (streams.length === 0) {
                    console.log(`[${this.hostName}] Không có track phụ đề mềm nào trong video.`);
                    if (uploadId) {
                        await HostUpload.findByIdAndUpdate(uploadId, { 
                            subtitleStatus: 'completed', 
                            subtitleLog: `Không có phụ đề` 
                        }).catch(() => {});
                    }
                    return resolve(false);
                }

                console.log(`[${this.hostName}] Tìm thấy ${streams.length} track phụ đề. Bóc tách đồng loạt...`);
                
                // Chuẩn bị câu lệnh FFMPEG bóc tách tất cả phụ đề TRONG 1 LẦN CHẠY
                let ffmpegCmd = `ffmpeg -v error -i "${videoUrl}"`;
                const subtitleTracks = [];
                let unknownCount = 1;
                
                // Map chuẩn ngôn ngữ nghiêm ngặt
                const languageMap = {
                    'vi': 'Vietnamese', 'vie': 'Vietnamese', 'vietnamese': 'Vietnamese',
                    'en': 'English', 'eng': 'English', 'english': 'English',
                    'ar': 'Arabic', 'ara': 'Arabic', 'arabic': 'Arabic',
                    'id': 'Indonesian', 'ind': 'Indonesian', 'indonesian': 'Indonesian',
                    'ma': 'Malay', 'msa': 'Malay', 'may': 'Malay', 'malay': 'Malay',
                    'ja': 'Japanese', 'jpn': 'Japanese', 'japanese': 'Japanese',
                    'fr': 'French', 'fre': 'French', 'fra': 'French', 'french': 'French',
                    'ko': 'Korean', 'kor': 'Korean', 'korean': 'Korean',
                    'pt': 'Portuguese', 'por': 'Portuguese', 'portuguese': 'Portuguese',
                    'es': 'Spanish', 'spa': 'Spanish', 'spanish': 'Spanish',
                    'th': 'Thai', 'tha': 'Thai', 'thai': 'Thai',
                    'zh': 'Chinese', 'chi': 'Chinese', 'zho': 'Chinese', 'ch': 'Chinese', 'chinese': 'Chinese'
                };
                
                for (let i = 0; i < streams.length; i++) {
                    const stream = streams[i];
                    
                    const langCode = stream.tags?.language || stream.tags?.LANGUAGE || '';
                    const titleTag = stream.tags?.title || stream.tags?.TITLE || '';
                    
                    const lowerLang = langCode.toLowerCase().trim();
                    const lowerTitle = titleTag.toLowerCase().trim();
                    
                    let label = '';
                    
                    // Ưu tiên phát hiện Tiếng Việt
                    if (lowerLang.includes('vi') || lowerTitle.includes('vi') || lowerTitle.includes('viet')) {
                        label = 'Tiếng Việt';
                    } 
                    // Sau đó là Tiếng Anh
                    else if (lowerLang.includes('en') || lowerTitle.includes('eng')) {
                        label = 'Tiếng Anh';
                    } 
                    // Các ngôn ngữ khác
                    else if (languageMap[lowerLang]) {
                        label = languageMap[lowerLang];
                    } 
                    else if (languageMap[lowerTitle]) {
                        label = languageMap[lowerTitle];
                    }
                    else if (lowerLang.length === 2 || lowerLang.length === 3) {
                        label = lowerLang.toUpperCase();
                    }
                    else {
                        label = `Unknown ${unknownCount++}`;
                    }
                    
                    // Chống trùng lặp tên nếu có nhiều track
                    const existingLabelCount = subtitleTracks.filter(t => t.label.startsWith(label)).length;
                    const finalLabel = existingLabelCount > 0 ? `${label} ${existingLabelCount + 1}` : label;
                    
                    const vttPath = path.join(__dirname, '..', `temp_sub_${slug}_${i}.vtt`);
                    const isVietnamese = finalLabel.includes('Tiếng Việt');
                    
                    subtitleTracks.push({ 
                        index: i, 
                        label: finalLabel, 
                        vttPath, 
                        isDefault: isVietnamese 
                    });
                    
                    // Thêm map command
                    ffmpegCmd += ` -map 0:s:${i} -c:s webvtt "${vttPath}"`;
                }
                
                // Nếu không tìm thấy track nào phù hợp, báo hoàn tất luôn
                if (subtitleTracks.length === 0) {
                    console.log(`[${this.hostName}] Không tìm thấy track phụ đề nào.`);
                    if (uploadId) {
                        await HostUpload.findByIdAndUpdate(uploadId, { 
                            subtitleStatus: 'completed', 
                            subtitleLog: `Không có phụ đề trong file` 
                        }).catch(() => {});
                    }
                    return resolve(true);
                }
                
                // Sắp xếp để Tiếng Việt được ưu tiên đẩy lên Hydrax trước tiên (giúp nó thành mặc định)
                subtitleTracks.sort((a, b) => {
                    if (a.isDefault && !b.isDefault) return -1;
                    if (!a.isDefault && b.isDefault) return 1;
                    return 0;
                });
                
                ffmpegCmd += ` -y`;

                if (uploadId) {
                    await HostUpload.findByIdAndUpdate(uploadId, { 
                        subtitleLog: `Đang bóc tách đồng loạt ${streams.length} track phụ đề bằng tốc độ cao...` 
                    }).catch(() => {});
                }

                try {
                    // Thực thi bóc tách 1 lần duy nhất (Nhanh gấp 10-20 lần so với lặp)
                    await execPromise(ffmpegCmd, { maxBuffer: 10 * 1024 * 1024 });
                    
                    const cloudinary = require('cloudinary').v2;
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET
                    });

                    for (let i = 0; i < subtitleTracks.length; i++) {
                        const track = subtitleTracks[i];
                        if (fs.existsSync(track.vttPath) && fs.statSync(track.vttPath).size > 0) {
                            // --- AI Language Detection from File Content ---
                            if (track.label.startsWith('Unknown')) {
                                try {
                                    const buffer = Buffer.alloc(10000);
                                    const fd = fs.openSync(track.vttPath, 'r');
                                    const bytesRead = fs.readSync(fd, buffer, 0, 10000, 0);
                                    fs.closeSync(fd);
                                    const text = buffer.toString('utf8', 0, bytesRead).toLowerCase();
                                    
                                    if (/[ăđơưảãạằẳẵắặầẩẫấậẻẽẹềểễếệỉĩịỏõọồổỗốộờởỡớợủũụừửữứựỷỹỵ]/i.test(text)) {
                                        track.label = 'Tiếng Việt';
                                        track.isDefault = true;
                                    } else if (/[\u0600-\u06FF]/.test(text)) track.label = 'Arabic';
                                    else if (/[\u4E00-\u9FFF]/.test(text)) track.label = 'Chinese';
                                    else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) track.label = 'Japanese';
                                    else if (/[\uAC00-\uD7AF]/.test(text)) track.label = 'Korean';
                                    else if (/[\u0E00-\u0E7F]/.test(text)) track.label = 'Thai';
                                    else if (/[\u0400-\u04FF]/.test(text)) track.label = 'Russian';
                                    else if (/[\u0900-\u097F]/.test(text)) track.label = 'Hindi';
                                    else if (/\b(the|you|and|that|this|with|have)\b/i.test(text)) track.label = 'Tiếng Anh';
                                    else if (/\b(yang|dan|tidak|untuk|dengan|kamu)\b/i.test(text)) track.label = 'Indonesian';
                                } catch(e) {}
                            }
                            // ---------------------------------------------
                            
                            if (uploadId) {
                                await HostUpload.findByIdAndUpdate(uploadId, { 
                                    subtitleLog: `Đang tải phụ đề [${track.label}] (${i+1}/${streams.length}) lên Cloudinary...` 
                                }).catch(() => {});
                            }
                            console.log(`[${this.hostName}] Đang tải phụ đề "${track.label}" lên Cloudinary...`);
                            
                            try {
                                const uploadResult = await cloudinary.uploader.upload(track.vttPath, {
                                    folder: 'film/subtitles',
                                    resource_type: 'raw',
                                    use_filename: true,
                                    unique_filename: true
                                });
                                
                                if (uploadResult && uploadResult.secure_url) {
                                    const publicUrl = uploadResult.secure_url;
                                    
                                    console.log(`[${this.hostName}] Gắn phụ đề "${track.label}" vào Abyss...`);
                                    const hydraxSubUrl = `https://api.hydrax.net/${this.apiKey}/subtitle/${slug}`;
                                    const hydraxResp = await axios.post(hydraxSubUrl, {
                                        name: track.label,  // Hydrax/Abyss uses 'name' for the subtitle language
                                        label: track.label, // Fallback for standard VTT APIs
                                        url: publicUrl,
                                        default: track.isDefault ? 1 : 0,
                                        is_default: track.isDefault ? 1 : 0,
                                        isDefault: track.isDefault ? true : false,
                                        default_sub: track.isDefault ? 1 : 0
                                    }).catch(e => e.response || { data: { status: false, msg: e.message }});
                                    
                                    if (hydraxResp.data && hydraxResp.data.status === true) {
                                        console.log(`[${this.hostName}] ✅ Gắn phụ đề "${track.label}" thành công.`);
                                    } else {
                                        const errMsg = hydraxResp.data?.msg || JSON.stringify(hydraxResp.data);
                                        console.log(`[${this.hostName}] ⚠️ Hydrax API lỗi cho "${track.label}":`, errMsg);
                                        if (track.label === 'Tiếng Việt' || track.isDefault) {
                                            throw new Error(`Abyss API từ chối phụ đề: ${errMsg}. Link: ${publicUrl}`);
                                        }
                                    }
                                } else {
                                    if (track.label === 'Tiếng Việt' || track.isDefault) {
                                        throw new Error(`Tải phụ đề lên Cloudinary thất bại cho track ${track.index}`);
                                    }
                                }
                            } catch (err) {
                                console.log(`[${this.hostName}] ❌ Lỗi upload Cloudinary/Abyss track ${track.index}:`, err.message);
                                if (track.label === 'Tiếng Việt' || track.isDefault) {
                                    throw err; // Re-throw to trigger the catch block below
                                }
                            }
                        }
                        
                        // Dọn dẹp file temp
                        try { if (fs.existsSync(track.vttPath)) fs.unlinkSync(track.vttPath); } catch (e) {}
                    }
                } catch (err) {
                    console.log(`[${this.hostName}] ❌ Lỗi quá trình bóc tách/gắn phụ đề đồng loạt:`, err.message);
                    // Dọn dẹp nếu có lỗi
                    for (let track of subtitleTracks) {
                        try { if (fs.existsSync(track.vttPath)) fs.unlinkSync(track.vttPath); } catch (e) {}
                    }
                    if (uploadId) {
                        await HostUpload.findByIdAndUpdate(uploadId, { 
                            subtitleStatus: 'failed', 
                            subtitleLog: `Lỗi: ${err.message}` 
                        }).catch(() => {});
                    }
                    throw err; // Ném ra ngoài
                }
                
                if (uploadId) {
                    await HostUpload.findByIdAndUpdate(uploadId, { 
                        subtitleStatus: 'completed', 
                        subtitleLog: `Hoàn tất bóc tách phụ đề` 
                    }).catch(() => {});
                }
                resolve(true);
            } catch (e) {
                console.log(`[${this.hostName}] ❌ Lỗi quét phụ đề:`, e.message);
                if (uploadId) {
                    await HostUpload.findByIdAndUpdate(uploadId, { 
                        subtitleStatus: 'error', 
                        subtitleLog: `Lỗi quét phụ đề: ${e.message}` 
                    }).catch(() => {});
                }
                resolve(false);
            }
        });
    }

    async remoteUpload(videoUrl, title, folderId = null, uploadId = null) {
        try {
            console.log(`[${this.hostName}] Starting Stream Pipe upload for: ${title}`);
            const FormData = require('form-data');
            const { Transform } = require('stream');

            const dl = await axios({url: videoUrl, responseType: 'stream'});
            
            let uploadedBytes = 0;
            let lastLogTime = Date.now();
            const progressStream = new Transform({
                transform(chunk, encoding, callback) {
                    uploadedBytes += chunk.length;
                    const now = Date.now();
                    if (now - lastLogTime > 5000) { // Log every 5 seconds
                        console.log(`[Abyss Stream] ${title}: ${(uploadedBytes / 1024 / 1024).toFixed(2)} MB uploaded...`);
                        lastLogTime = now;
                    }
                    callback(null, chunk);
                }
            });

            const fd = new FormData();
            fd.append('file', dl.data.pipe(progressStream), `${title}.mp4`);
            if (folderId) {
                fd.append('parentId', folderId);
            }
            
            const response = await axios.post(`http://up.hydrax.net/${this.apiKey}`, fd, {
                headers: fd.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            if (response.data && response.data.slug) {
                const slug = response.data.slug;
                console.log(`[${this.hostName}] Upload successful, slug: ${slug}`);
                
                // Kích hoạt tiến trình bóc tách và nạp phụ đề ngầm (Background Task)
                this.uploadSubtitleFromVideo(videoUrl, slug, uploadId).catch(()=>{});
                
                return slug;
            }
            throw new Error('Upload failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error(`[${this.hostName}] Upload Error:`, error.message);
            throw error;
        }
    }

    async checkUploadStatus(slug) {
        try {
            const response = await axios.get(`https://api.hydrax.net/${this.apiKey}/slug/${slug}/status`);
            const data = response.data;
            if (data.status === true && data.msg === 'Ready') {
                return { status: 'completed', videoId: slug };
            } else if (data.status === false) {
                return { status: 'error', error: data.msg };
            }
            return { status: 'pending' };
        } catch (error) {
            console.error(`[${this.hostName}] Status Check Error:`, error.message);
            return { status: 'pending' };
        }
    }

    getEmbedUrl(slug) {
        return `https://abyssplayer.com/${slug}`;
    }

    async deleteVideo(slug) {
        try {
            if (!slug) return false;
            const resp = await axios.get(`https://api.hydrax.net/${this.apiKey}/delete/${slug}`);
            return resp.data?.status === true;
        } catch (e) {
            console.error(`[${this.hostName}] deleteVideo error:`, e.message);
            return false;
        }
    }

    // --- Folder APIs ---
    async createFolder(folderName) {
        try {
            console.log(`[${this.hostName}] createFolder: ${folderName}`);
            if (!folderName) return null;
            const resp = await axios.post(`https://api.abyss.to/v1/folders`, 
                { name: folderName },
                { headers: { Authorization: `Bearer ${this.apiKey}` } }
            );
            return resp.data?.id || null;
        } catch (e) {
            console.log(`[${this.hostName}] createFolder error:`, e.response?.data || e.message);
            return null;
        }
    }

    async assignToFolder(videoId, folderId) {
        try {
            console.log(`[${this.hostName}] assignToFolder: video=${videoId} folder=${folderId}`);
            if (!videoId || !folderId) return false;
            // Abyss API uses PATCH /v1/files/:id?parentId=folderId
            const resp = await axios.patch(`https://api.abyss.to/v1/files/${videoId}?parentId=${folderId}`, 
                null,
                { headers: { Authorization: `Bearer ${this.apiKey}` } }
            );
            return !!resp.data?.id;
        } catch (e) {
            console.log(`[${this.hostName}] assignToFolder error:`, e.response?.data || e.message);
            return false;
        }
    }
}

// Cấu hình linh hoạt từ biến môi trường
const play4meAPI = process.env.PLAY4ME_API_KEY 
    ? new PremiumHostService('Play4Me', 'https://player4me.com', process.env.PLAY4ME_API_KEY, process.env.PLAY4ME_EMBED_URL || 'https://pchill-play.online/#') 
    : null;

const abyssAPI = process.env.ABYSS_API_KEY 
    ? new AbyssHostService(process.env.ABYSS_API_KEY) 
    : null;

module.exports = {
    PremiumHostService,
    AbyssHostService,
    play4meAPI,
    abyssAPI
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
