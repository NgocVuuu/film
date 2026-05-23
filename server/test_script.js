const mongoose = require('mongoose');
const { addUploadJob } = require('./utils/queue');
const hostUpload = require('./models/HostUpload');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');
  
  const movie = await mongoose.model('Movie', new mongoose.Schema({ name: String })).findOne();
  if (!movie) { console.log('no movie'); return; }

  const existing = await hostUpload.findOne({
    movieId: movie._id,
    sourcePage: 'https://pixeldrain.com/u/i2c7iAfG',
    status: { $in: ['pending', 'processing', 'completed'] }
  });
  console.log('existing:', !!existing);

  console.log('adding job');
  await addUploadJob({
    sourceUrl: 'https://pixeldrain.com/u/i2c7iAfG',
    movieId: movie._id.toString(),
    showName: movie.name
  });
  console.log('added job');
  process.exit(0);
}
run().catch(console.error);
