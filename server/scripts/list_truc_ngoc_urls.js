const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Movie = require('../models/Movie');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');

  const queries = [
    { slug: { $regex: 'pursuit-of-jade', $options: 'i' } },
    { mkvUrl: { $regex: 'pursuit-of-jade', $options: 'i' } },
    { origin_name: { $regex: 'pursuit of jade|truc ngoc', $options: 'i' } },
    { name: { $regex: 'pursuit of jade|truc ngoc', $options: 'i' } }
  ];

  let movie = null;
  for (const q of queries) {
    movie = await Movie.findOne(q).lean();
    if (movie) break;
  }

  if (!movie) {
    console.log('NOT_FOUND');
    return;
  }

  const kk = (movie.episodes || []).find((s) => String(s.server_name || '').toLowerCase().includes('kk'));
  const urls = (kk?.server_data || []).map((x) => x.link_embed).filter(Boolean);

  console.log(`MOVIE_ID=${movie._id}`);
  console.log(`TITLE=${movie.origin_name || movie.name || ''}`);
  console.log(`SLUG=${movie.slug || ''}`);
  console.log(`KK_COUNT=${urls.length}`);

  urls.forEach((u, i) => {
    console.log(`${String(i + 1).padStart(3, '0')} ${u}`);
  });

  const outPath = path.join(__dirname, '..', '..', 'tmp_truc_ngoc_urls.txt');
  fs.writeFileSync(outPath, urls.join('\n'), 'utf8');
  console.log(`SAVED=${outPath}`);
}

main()
  .catch((e) => {
    console.error('ERROR', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });
