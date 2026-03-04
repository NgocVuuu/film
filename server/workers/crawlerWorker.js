const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const { syncAll } = require('../crawler'); // Reuse crawler logic, but it now runs in this separate thread

// Define exactly how this thread should behave
async function startWorker() {
    try {
        console.log(`[Worker] StartedCrawler on Thread ID: ${require('worker_threads').threadId}`);

        // We MUST connect to MongoDB inside the thread independently
        if (workerData && workerData.mongoUri) {
            await mongoose.connect(workerData.mongoUri);
            console.log('[Worker] Connected to MongoDB');

            // Run the sync based on options passed from Main Thread
            const options = workerData.options || {};
            await syncAll(options);

            // Signal the main thread that work is done
            parentPort.postMessage({ success: true, message: 'Sync completed successfully' });
        } else {
            throw new Error('MONGO_URI not provided to worker');
        }

    } catch (error) {
        console.error('[Worker] Error:', error);
        parentPort.postMessage({ success: false, error: error.message });
    } finally {
        // Disconnect and exit thread to free memory
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(0);
    }
}

startWorker();
