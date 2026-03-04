const realDebrid = require('./realDebrid');
// const allDebrid = require('./allDebrid');
// const premiumize = require('./premiumize');

class DebridManager {
    constructor() {
        this.providers = [
            { id: 'rd', service: realDebrid, priority: 1, name: 'Real-Debrid' },
            // { id: 'ad', service: allDebrid, priority: 2, name: 'AllDebrid' },
            // { id: 'pm', service: premiumize, priority: 3, name: 'Premiumize' }
        ];

        // Sort providers by priority (lowest number = highest priority)
        this.providers.sort((a, b) => a.priority - b.priority);

        // [BẢO MẬT CẤP ĐỘ 7] Chống Thundering Herd (Bão bầy đàn)
        // Lưu trữ các Promise đang thực thi để tái sử dụng thay vì gọi API liên tiếp
        this.pendingRequests = new Map();
    }

    /**
     * Determines which provider should handle this proxy Index and attempts to get a stream link.
     * Uses a cascading fallback strategy if a provider fails or its keys are dead.
     * [Wrapper] có gắn Cache Promise chống Bão Bầy Đàn (Thundering Herd)
     */
    async getStreamLink(magnet, proxyIndex, proxyDomain = null) {
        // Sinh ra cặp Key duy nhất đại diện cho Request này
        // Nếu 100 ông User cùng gọi tới `magnetA` trên Node `proxyIndex: 0`, thì cacheKey giống hệt nhau
        const cacheKey = `${magnet}_${proxyIndex}`;

        // 1. Kiểm tra xem đã có ai đang "xung phong" gọi API cho magnet này chưa?
        if (this.pendingRequests.has(cacheKey)) {
            console.warn(`[DebridManager] 🛡️ Chặn bão bầy đàn: Tái sử dụng Promise cho magnet ${magnet.substring(0, 20)}...`);
            // 99 ông sập tới sau sẽ đứng hình ở lệnh await này chung với ông đầu tiên
            return this.pendingRequests.get(cacheKey);
        }

        // 2. Chưa có ai gọi, tạo một Promise "khóa" cửa
        // Bản thân hành động gọi API là một Promise. Ta lưu cái "Lệnh" này vào Map để người sau thấy báo bận
        const requestPromise = this._executeStreamLinkFallback(magnet, proxyIndex, proxyDomain)
            .finally(() => {
                // 3. Khi API gọi xong (Dù thành công lấy link hay thất bại ném lỗi), phải xóa Key đi để giải phóng RAM
                // và đón lứa Request tươi mới sau này (ví dụ 6 tiếng sau link hết hạn)
                this.pendingRequests.delete(cacheKey);
            });

        this.pendingRequests.set(cacheKey, requestPromise);

        // Người đầu tiên sẽ tự await chính nó
        return requestPromise;
    }

    /**
     * Logic Gọi API Fallback nặng nhọc được tách rời (Chỉ chạy 1 lần cho 1 kịch bản Bão bầy đàn)
     */
    async _executeStreamLinkFallback(magnet, proxyIndex, proxyDomain = null) {
        let lastError = null;

        for (const provider of this.providers) {
            try {
                // Thử get stream link với Provider hiện tại
                const result = await provider.service.getStreamLink(magnet, proxyIndex, proxyDomain);
                return result;
            } catch (error) {
                // Nếu lỗi là do Provider hết Key (Dead) hoặc gặp sự cố server (5xx)
                if (
                    (error.code === 'PROXY_KEY_DEAD') ||
                    (error.message && error.message.includes('PROXY_KEY_DEAD')) ||
                    (error.response && error.response.status >= 500)
                ) {
                    console.warn(`[DebridManager] Provider ${provider.name} thất bại hoặc cạn Key ID. Đang Fallback sang Provider tiếp theo...`);
                    lastError = error;
                    continue; // Chuyển sang Provider dự phòng
                }

                // Nếu lỗi là do Magnet chưa Cache (Downloading) -> Không fallback, ném thẳng về báo User chờ
                if (error.isTorrentDownloading) {
                    throw error;
                }

                // Nếu lỗi là do API Key thiếu (Chưa cấu hình Server), lưu lại xem Provider sau có cấu hình không
                if (error.message && error.message.includes('API_KEY is not configured')) {
                    lastError = error;
                    continue;
                }

                throw error; // Các lỗi kịch bản khác (Ví dụ link rác, Torrent hỏng) -> Throw luôn
            }
        }

        // Nếu tất cả Provider đều thất bại
        if (lastError && (lastError.code === 'PROXY_KEY_DEAD' || (lastError.message && lastError.message.includes('PROXY_KEY_DEAD')))) {
            const keyError = new Error('ALL_PROXY_KEYS_DEAD');
            keyError.code = 'ALL_PROXY_KEYS_DEAD';
            throw keyError;
        }

        throw lastError || new Error('All Debrid providers failed to yield a streaming link.');
    }

    /**
     * Finds the correct provider based on the keyId prefix (e.g., 'rd_key_0' -> 'rd')
     * and marks that key as dead.
     */
    markKeyAsDead(keyId) {
        if (!keyId) return;

        const prefix = keyId.split('_')[0]; // Lấy 'rd', 'ad', 'pm'
        const provider = this.providers.find(p => p.id === prefix);

        if (provider) {
            console.warn(`[DebridManager] Gạch tên Key ${keyId} thuộc Provider ${provider.name}`);
            provider.service.markKeyAsDead(keyId);
        } else {
            console.warn(`[DebridManager] Không tìm thấy Provider phù hợp để gạch tên Key ${keyId}`);
        }
    }

    /**
     * Unrestricts a link directly, extracting the target provider from the fallback key itself if needed
     * or relying on standard fallback logic if it's purely generic.
     */
    async unrestrictLink(fallbackKey, link) {
        // Mặc định, nếu Real-Debrid trả về _realKeyFallback, chúng ta vẫn ưu tiên dùng RD để unrestrict
        // Tuy nhiên ở hệ thống Multi-Debrid, link này đã là link của Provider nào phát sinh ra.
        // Tạm thời, gán cho Provider số 1 (Real-Debrid) để tương thích ngược. 
        // Khi mở rộng, cần lưu cache link thuộc về provider nào hoặc pass Provider ID vào JWT.
        try {
            return await this.providers[0].service.unrestrictLink(fallbackKey, link);
        } catch (error) {
            console.error(`[DebridManager] Lỗi Unrestrict Link qua ${this.providers[0].name}:`, error.message);
            throw error;
        }
    }

    /**
     * Helper specifically for Real-Debrid backward compatibility
     */
    getKeyForProxy(proxyIndex) {
        // Trong kịch bản hash proxy Index trước lúc chọn Node Nginx, 
        // hệ thống cũ gọi trực tiếp rd.getKeyForProxy() để né dead Node.
        // Ta sẽ check xem Provider ưu tiên số 1 (RD) có key nào sống không
        return this.providers[0].service.getKeyForProxy(proxyIndex);
    }
}

module.exports = new DebridManager();
