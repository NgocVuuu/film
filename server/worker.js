require('dotenv').config();
const { Worker } = require('bullmq');
const { connection, UPLOAD_QUEUE_NAME } = require('./utils/queue');
const { runAutoUploadPipeline } = require('./auto_pipeline');
const { startStatusPoller } = require('./utils/statusPoller');

// Khởi chạy poller kiểm tra trạng thái video
startStatusPoller();

console.log('Worker is starting up, waiting for jobs on queue:', UPLOAD_QUEUE_NAME);

const worker = new Worker(UPLOAD_QUEUE_NAME, async (job) => {
    console.log(`\n[Worker] Processing Job ${job.id}`);
    console.log(`[Worker] Job Data:`, job.data);
    
    // Call the function from auto_pipeline
    // Ensure runAutoUploadPipeline returns a promise that rejects on failure
    try {
        const result = await runAutoUploadPipeline(job.data);
        console.log(`[Worker] Job ${job.id} completed successfully.`);
        return result;
    } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error.message);
        // Throwing error will cause BullMQ to retry or mark as failed
        throw error;
    }
}, {
    connection,
    concurrency: 1, // Only process one job at a time to prevent rate limiting / overloading puppeteer
});

worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

worker.on('error', err => {
    // log any unexpected errors
    console.error('[Worker] Fatal error:', err);
});
