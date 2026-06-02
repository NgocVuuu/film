require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const hostManager = require('./utils/hostManager');
    const HostUpload = require('./models/HostUpload');
    const { play4meAPI } = require('./utils/videoHostProviders');
    try {
        const doc = await HostUpload.findOne({taskId: 'h86jb'});
        if (doc) {
            console.log('Testing pollAndSyncStatus on:', doc._id);
            await hostManager.pollAndSyncStatus(play4meAPI, 'h86jb', doc._id);
            console.log('Done pollAndSyncStatus. DB Status now:', (await HostUpload.findById(doc._id)).status);
        } else {
            console.log('Not found');
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});
