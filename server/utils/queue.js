const { runAutoUploadPipeline } = require('../auto_pipeline');

const memoryQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || memoryQueue.length === 0) return;
    isProcessing = true;
    
    while (memoryQueue.length > 0) {
        const jobData = memoryQueue.shift();
        console.log(`\n[Memory-Queue] Bắt đầu xử lý Job: ${jobData.sourceUrl}`);
        try {
            await runAutoUploadPipeline(jobData);
            console.log(`[Memory-Queue] Hoàn thành Job: ${jobData.sourceUrl}`);
        } catch (error) {
            console.error(`[Memory-Queue] Job thất bại:`, error.message);
        }
    }
    
    isProcessing = false;
}

/**
 * Add a new url to be processed by the auto_pipeline
 */
async function addUploadJob(jobData) {
    memoryQueue.push(jobData);
    console.log(`[Memory-Queue] Đã thêm Job vào hàng đợi. Đang chờ xử lý... (Vị trí: ${memoryQueue.length})`);
    
    // Khởi chạy ngầm xử lý queue mà không block thread
    processQueue().catch(e => console.error('[Memory-Queue] Lỗi tiến trình Queue:', e));
    
    return { id: Date.now() + Math.random().toString() };
}

module.exports = {
    addUploadJob,
    getQueueLength: () => memoryQueue.length,
    UPLOAD_QUEUE_NAME: 'UploadQueue_Memory'
};
