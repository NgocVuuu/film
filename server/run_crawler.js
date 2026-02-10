const mongoose = require('mongoose');
require('dotenv').config();
const { syncMovies } = require('./crawler');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to DB for One-time Crawl');
        await syncMovies();
        console.log('Crawl finished. Exiting...');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
