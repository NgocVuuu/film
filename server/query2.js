require('dotenv').config();
const { play4meAPI } = require('./utils/videoHostProviders');
play4meAPI.checkUploadStatus('h86jb').then(console.log).catch(console.error);
