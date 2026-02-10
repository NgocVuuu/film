const mongoose = require('mongoose');
const { syncAll } = require('./crawler');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('DB Connected');
        await syncAll();
        console.log('Sync Done');
        process.exit(0);
    })
    .catch(err => console.error(err));
