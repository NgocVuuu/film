require('dotenv').config();
const mongoose = require('mongoose');
const hostManager = require('./utils/hostManager');
const { play4meAPI, seekStreamingAPI } = require('./utils/videoHostProviders');
const hostApis = { Play4Me: play4meAPI, SeekStreaming: seekStreamingAPI };

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
    const pending = await hostManager.findUploads({ status: { $in: ['pending', 'processing'] } }, { limit: 100 });
    console.log('Found ' + pending.length + ' pending uploads. Polling...');
    for (const doc of pending) {
        const api = hostApis[doc.host];
        if (api && doc.taskId) {
            await hostManager.pollAndSyncStatus(api, doc.taskId, doc._id);
        }
    }
    console.log('Done!');
    process.exit(0);
}
run();
