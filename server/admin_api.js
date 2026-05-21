const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const hostManager = require('./utils/hostManager');
const hostUpload = require('./models/HostUpload');
const { runAutoUploadPipeline } = require('./auto_pipeline');
const captchaQueue = require('./utils/captchaQueue');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/admin/uploads', async (req, res) => {
  const q = {};
  if (req.query.host) q.host = req.query.host;
  if (req.query.status) q.status = req.query.status;
  const rows = await hostManager.findUploads(q, { limit: parseInt(req.query.limit||100) });
  res.json(rows);
});

app.post('/admin/uploads/:id/retry', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await hostUpload.findById(id).lean();
    if (!doc) return res.status(404).send('Not found');
    // re-run pipeline for the source page (best-effort)
    if (!doc.sourcePage) return res.status(400).send('No sourcePage to retry');
    // run in background
    runAutoUploadPipeline(doc.sourcePage).catch(()=>{});
    res.json({ ok: true, message: 'Retry started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/host-folders', async (req, res) => {
  const rows = await require('./utils/hostManager').findUploads({}, { limit: 10 }).catch(()=>[]);
  res.json({ ok: true, info: 'Use hostManager API for folder listing' });
});

app.post('/admin/create-folder', async (req, res) => {
  try {
    const { series, season, host, displayName } = req.body;
    if (!host) return res.status(400).send('host required');
    const folderId = await hostManager.createOrGetFolder(series, season, host, displayName);
    res.json({ ok: true, folderId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/uploads/:id/assign-folder', async (req, res) => {
  try {
    const id = req.params.id;
    const { host, series, season, folderName } = req.body;
    const doc = await hostUpload.findById(id).lean();
    if (!doc) return res.status(404).send('not found');
    const result = await hostManager.assignUploadToFolder(host, doc.taskId, series || doc.series, season || doc.season, folderName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual crawl trigger for direct url
app.post('/admin/crawl-url', async (req, res) => {
  let browser;
  try {
    const { movieId, url } = req.body;
    if (!movieId || !url) {
      return res.status(400).json({ error: 'movieId and url are required' });
    }

    const Movie = require('./models/Movie');
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }

    const { crawlSeasonEpisodes } = require('./episodeCrawler');
    const { addUploadJob } = require('./utils/queue');
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    
    if (puppeteer.plugins.length === 0) {
      puppeteer.use(StealthPlugin());
    }

    console.log(`\n🚀 [ADMIN-CRAWL] Bắt đầu yêu cầu cào thủ công cho phim: "${movie.name}"`);
    console.log(`🔗 [ADMIN-CRAWL] URL nguồn: ${url}`);
    
    let epUrls = [];
    console.log(`🌐 [ADMIN-CRAWL] Đang khởi chạy trình duyệt Puppeteer Stealth ngầm...`);
    // Bỏ qua crawlSeasonEpisodes vì logic mới của auto_pipeline sẽ tự xử lý trọn bộ từ link gốc
    // Chỉ trực tiếp queue link cha vào pipeline
    epUrls = [];

    async function queueEp(epUrl) {
      console.log(`🔍 [QUEUE] Kiểm tra trùng lặp cho tập: ${epUrl}`);
      const existing = await hostUpload.findOne({
        movieId: movie._id,
        sourcePage: epUrl,
        status: { $in: ['pending', 'processing', 'completed'] }
      });

      if (existing) {
        console.log(`⏭️ [SKIP] Tập này đã tồn tại hoặc đã cào trước đó (Trạng thái: ${existing.status}). Bỏ qua.`);
        return false;
      }

      console.log(`📥 [QUEUE-ADD] Chưa tồn tại. Tiến hành xếp hàng tập mới vào BullMQ...`);
      await addUploadJob({
        sourceUrl: epUrl,
        movieId: movie._id.toString(),
        showName: movie.name
      });
      console.log(`✅ [QUEUE-ADD] Xếp hàng BullMQ thành công cho tập: ${epUrl}`);
      return true;
    }

    let queuedCount = 0;
    if (epUrls && epUrls.length > 0) {
      console.log(`📥 [QUEUE] Bắt đầu xếp hàng loạt ${epUrls.length} tập phim...`);
      for (const epUrl of epUrls) {
        const ok = await queueEp(epUrl);
        if (ok) queuedCount++;
      }
      console.log(`\n🎉 [ADMIN-CRAWL] Hoàn tất cào thủ công! Đã xếp hàng thêm mới thành công ${queuedCount}/${epUrls.length} tập.`);
      res.json({ ok: true, count: queuedCount, message: `Đã tìm thấy ${epUrls.length} tập và xếp hàng ${queuedCount} tập mới thành công!` });
    } else {
      console.log(`📥 [QUEUE] Xử lý cào tập đơn lẻ từ link trực tiếp...`);
      const ok = await queueEp(url);
      if (ok) {
        console.log(`\n🎉 [ADMIN-CRAWL] Hoàn tất cào thủ công tập đơn thành công!`);
        res.json({ ok: true, count: 1, message: 'Đã xếp hàng 1 tập đơn thành công!' });
      } else {
        console.log(`\n🎉 [ADMIN-CRAWL] Hoàn tất! Tập phim này đã tồn tại trong hàng đợi hoặc đã hoàn thành.`);
        res.json({ ok: true, count: 0, message: 'Tập phim/URL này đã tồn tại trong hàng đợi hoặc đã hoàn thành.' });
      }
    }
  } catch (e) {
    console.error(`[ADMIN-CRAWL] Error:`, e);
    if (browser) {
      try { await browser.close(); } catch(err){}
    }
    res.status(500).json({ error: e.message });
  }
});

// Webhook from Host API replacing poll where applicable
app.post('/webhook/host-callback', async (req, res) => {
  try {
    const { taskId, host, status, error, videoId } = req.body;
    if (!taskId || !host) return res.status(400).send('taskId and host required');
    const doc = await hostManager.getUploadByTask(host, taskId);
    if (!doc) return res.status(404).send('Upload task not found');

    let mapped = 'pending';
    if (status === 'completed' || status === 'success') mapped = 'completed';
    else if (status === 'error' || status === 'failed') mapped = 'failed';
    else mapped = 'processing';

    const updatedDoc = await hostManager.updateUpload(doc._id, { status: mapped, notes: error || '' });
    
    if (mapped === 'completed' && videoId && updatedDoc) {
      await hostManager.syncMovieEpisode(updatedDoc, videoId);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Captcha human-in-loop endpoints
app.get('/admin/captcha', async (req, res) => {
  const rows = captchaQueue.listJobs();
  res.json(rows);
});

app.get('/admin/captcha/:id', async (req, res) => {
  const id = req.params.id;
  const job = captchaQueue.getJob(id);
  if (!job) return res.status(404).send('not found');
  res.json({ id: job.id, pageUrl: job.pageUrl, reason: job.reason, status: job.status, screenshotPath: job.screenshotPath });
});

app.get('/admin/captcha/:id/screenshot', async (req, res) => {
  const id = req.params.id;
  const job = captchaQueue.getJob(id);
  if (!job) return res.status(404).send('not found');
  if (!job.screenshotPath) return res.status(404).send('no screenshot');
  res.sendFile(path.resolve(job.screenshotPath));
});

app.post('/admin/captcha/:id/resolve', async (req, res) => {
  const id = req.params.id;
  const ok = captchaQueue.resolveJob(id, req.body || {});
  if (!ok) return res.status(404).send('not found');
  res.json({ ok: true });
});

const port = process.env.ADMIN_PORT || 9888;
app.listen(port, () => console.log(`Admin API listening on ${port}`));

module.exports = app;
