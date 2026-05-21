const hostManager = require('./hostManager');
const { play4meAPI, seekStreamingAPI } = require('./videoHostProviders');

const hostApis = {
  Play4Me: play4meAPI,
  SeekStreaming: seekStreamingAPI
};

// Poll pending/processing uploads every 2 minutes
function startStatusPoller() {
    console.log('[POLLER] Khởi chạy bộ theo dõi trạng thái Upload (chạy mỗi 2 phút)...');
    setInterval(async () => {
        try {
            // Find all uploads that are pending or processing
            const pendingUploads = await hostManager.findUploads({ status: { $in: ['pending', 'processing'] } }, { limit: 50 });
            
            if (pendingUploads.length > 0) {
                console.log(`[POLLER] Tìm thấy ${pendingUploads.length} task đang chờ/xử lý. Tiến hành kiểm tra...`);
            }
            
            for (const doc of pendingUploads) {
                const api = hostApis[doc.host];
                if (api && doc.taskId) {
                    await hostManager.pollAndSyncStatus(api, doc.taskId, doc._id);
                }
            }
        } catch (error) {
            console.error('[POLLER] Lỗi trong quá trình kiểm tra trạng thái:', error.message);
        }
    }, 120000); // 2 minutes
}

module.exports = { startStatusPoller };
