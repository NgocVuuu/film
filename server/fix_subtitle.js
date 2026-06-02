require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const HostUpload = require('./models/HostUpload');
    const res = await HostUpload.updateMany(
        { sourcePage: 'Extractor Manual Sync', subtitleStatus: 'pending' },
        { $set: { subtitleStatus: 'completed' } }
    );
    console.log('Fixed tasks:', res.modifiedCount);
    process.exit(0);
});
