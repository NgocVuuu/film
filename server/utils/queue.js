const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    // password: process.env.REDIS_PASSWORD || '',
};

// Queue name
const UPLOAD_QUEUE_NAME = 'UploadQueue';

const uploadQueue = new Queue(UPLOAD_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3, // automatically retry failing jobs
        backoff: {
            type: 'exponential',
            delay: 1000 * 60, // 1 minute between retries
        },
        removeOnComplete: true, // remove successful jobs from queue
        removeOnFail: false,   // keep failed jobs for manual review/retry
    }
});

// Prevent unhandled Redis connection crashes and throttle terminal spam when Redis is down
let lastLoggedRedisError = 0;
uploadQueue.on('error', (err) => {
    const now = Date.now();
    if (now - lastLoggedRedisError > 30000) {
        console.warn(`[REDIS-QUEUE-ERROR] Redis server is offline (connect ECONNREFUSED 127.0.0.1:6379). Auto-reconnecting in background...`);
        lastLoggedRedisError = now;
    }
});

/**
 * Add a new url to be processed by the auto_pipeline
 */
async function addUploadJob(jobData) {
    // jobData typically looks like:
    // { showName, seasonNumber, episodeNumber, sourceUrl, targetHost, ... }
    return await uploadQueue.add('processUrl', jobData);
}

module.exports = {
    connection,
    UPLOAD_QUEUE_NAME,
    uploadQueue,
    addUploadJob
};
