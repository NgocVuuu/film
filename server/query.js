require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const HostUpload = require('./models/HostUpload');
    const docs = await HostUpload.find({ host: 'Play4Me' }).sort({createdAt: -1}).limit(5);
    console.log(docs.map(d => ({host: d.host, status: d.status, taskId: d.taskId, createdAt: d.createdAt})));
    process.exit(0);
});
