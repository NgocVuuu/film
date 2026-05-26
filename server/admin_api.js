const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const hostManager = require('./utils/hostManager');
const hostUpload = require('./models/HostUpload');
const { runAutoUploadPipeline } = require('./auto_pipeline');
const captchaQueue = require('./utils/captchaQueue');
const path = require('path');

const router = express.Router();

router.get('/uploads', async (req, res) => {
  const q = {};
  if (req.query.host) q.host = req.query.host;
  if (req.query.status) q.status = req.query.status;
  const rows = await hostManager.findUploads(q, { limit: parseInt(req.query.limit||100) });
  res.json(rows);
});

router.post('/uploads/:id/status-check', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await hostUpload.findById(id).lean();
    if (!doc) return res.status(404).send('Not found');

    const hostApis = require('./utils/videoHostProviders');
    const apiToPoll = hostApis[doc.host];
    if (apiToPoll && doc.taskId) {
        const status = await apiToPoll.checkStatus(doc.taskId);
        return res.json({ ok: true, status });
    }
    return res.status(400).send('No status provider or taskId');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/uploads/:id/cancel', async (req, res) => {
  try {
    const id = req.params.id;
    await hostUpload.findByIdAndUpdate(id, { 
        status: 'failed', 
        notes: 'Đã hủy thủ công để thoát kẹt' 
    });
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/uploads/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await hostUpload.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/uploads/:id/retry', async (req, res) => {
  try {
    const id = req.params.id;
    const { customLink } = req.body;
    const doc = await hostUpload.findById(id).lean();
    if (!doc) return res.status(404).send('Not found');

    if (customLink) {
        await hostUpload.findByIdAndUpdate(id, { status: 'processing', notes: `Đang lấy video từ link tuỳ chỉnh...`, taskId: null });
        
        (async () => {
            try {
                let directLinkToUpload = customLink;
                let finalFilename = doc.filename || "PhimMoi.mp4";
                
                if (customLink.includes('gofile.io')) {
                    const gofileService = require('./utils/gofileService');
                    const gofileIdMatch = customLink.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
                    if (gofileIdMatch) {
                        const files = await gofileService.getMkvFilesFromFolder(gofileIdMatch[1]);
                        if (files && files.length > 0) {
                            let matchedFile = files[0];
                            for (const f of files) {
                                const epMatch = f.name.match(/s?\d{1,2}e(\d{2})/i) || f.name.match(new RegExp(`e0?${(doc.episode||'').replace('E', '')}`, 'i'));
                                if (epMatch || f.name.toLowerCase().includes((doc.episode||'').toLowerCase())) {
                                    matchedFile = f;
                                    break;
                                }
                            }
                            if (matchedFile && matchedFile.link && !matchedFile.link.startsWith('javascript')) {
                                directLinkToUpload = matchedFile.link;
                                finalFilename = matchedFile.name;
                            } else {
                                throw new Error("Không thể trích xuất link tải trực tiếp từ thư mục Gofile");
                            }
                        } else {
                            throw new Error("Thư mục Gofile trống hoặc không truy cập được");
                        }
                    }
                } else if (customLink.includes('pixeldrain.com')) {
                    const idMatch = customLink.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                    if (idMatch) {
                        const axios = require('axios');
                        const pdId = idMatch[1];
                        const pdRes = await axios.get(`https://pixeldrain.com/api/file/${pdId}/info`).catch(()=>null);
                        if (pdRes && pdRes.data && pdRes.data.name) {
                            finalFilename = pdRes.data.name;
                            directLinkToUpload = `https://pixeldrain.com/api/file/${pdId}`;
                        } else {
                            throw new Error("Không lấy được thông tin file Pixeldrain");
                        }
                    }
                }

                const folderName = doc.series ? `${doc.series} - ${doc.season || ''}`.trim() : 'PhimMoi';
                const folderId = await hostManager.createOrGetFolder(doc.series, doc.season, doc.host, folderName);
                
                const uploadRes = await hostManager.remoteUploadWithRetry(doc.host, directLinkToUpload, finalFilename, folderId, id);
                if (!uploadRes.ok) throw new Error(uploadRes.error || 'upload failed');

                await hostUpload.findByIdAndUpdate(id, { 
                    taskId: uploadRes.taskId, 
                    status: 'pending', 
                    notes: '',
                    retries: (doc.retries || 0) + uploadRes.attempts 
                });

                const hostApis = require('./utils/videoHostProviders');
                const apiToPoll = hostApis[doc.host];
                if (apiToPoll) {
                    hostManager.pollAndSyncStatus(apiToPoll, uploadRes.taskId, id).catch(()=>{});
                }
            } catch(e) {
                await hostUpload.findByIdAndUpdate(id, { status: 'failed', notes: `Lỗi Custom Link: ${e.message}` });
            }
        })();

        return res.json({ ok: true, message: 'Processing custom link' });
    } else if (doc.sourcePage) {
      // Bỏ Smart Retry, luôn cào lại từ đầu bằng Puppeteer vì link tĩnh (Gofile/Pixeldrain) chết quá nhanh
      await hostUpload.findByIdAndUpdate(id, { status: 'processing', notes: 'Đang cào lại từ đầu bằng Puppeteer...', taskId: null });
      runAutoUploadPipeline({ sourceUrl: doc.sourcePage, targetEpisode: doc.episode }).catch(()=>{});
      return res.json({ ok: true, message: 'Recrawl started using Puppeteer' });
    } else {
      return res.status(400).send('No sourcePage to retry');
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/extract-links', async (req, res) => {
  try {
    const { id, movieUrl } = req.body;
    let targetUrl = movieUrl;
    
    if (id) {
        const doc = await hostUpload.findById(id).lean();
        if (!doc || !doc.sourcePage) return res.status(404).send('Not found or no sourcePage');
        targetUrl = doc.sourcePage;
    }

    if (!targetUrl) return res.status(400).send('movieUrl or id is required');

    const { runAutoUploadPipeline } = require('./auto_pipeline');
    const gofileService = require('./utils/gofileService');
    
    // Chạy Puppeteer ở chế độ extractOnly
    const links = await runAutoUploadPipeline({ sourceUrl: targetUrl, extractOnly: true });
    
    if (!links || !Array.isArray(links)) {
        return res.status(400).json({ error: 'Không tìm thấy link nào.' });
    }

    // Tự động phân tích và chia link từng tập
    const detailedLinks = [];
    const fetchPixeldrainName = async (id) => {
        try {
            const res = await require('axios').get(`https://pixeldrain.com/api/file/${id}/info`, { timeout: 3000 });
            return res.data.name || '';
        } catch(e) { return ''; }
    };

    let currentEpisodeLabel = 'Tập ?';
    
    // Mkvdrama thường trả link theo cụm (Gofile, Pixeldrain, Send) cho từng tập. 
    // Ta sẽ lấy tên tập từ Pixeldrain API (rất nhanh) và gán cho các link lân cận.
    for (const src of links) {
        try {
            let ep = currentEpisodeLabel;
            let name = 'Link bóc tách';
            let finalLink = src; // Dùng biến này thay vì src để đổi sang Direct Link
            
            if (src.includes('pixeldrain.com/u/')) {
                const pdMatch = src.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                if (pdMatch) {
                    finalLink = `https://pixeldrain.com/api/file/${pdMatch[1]}`; // Dịch thành Direct Link
                    const pdName = await fetchPixeldrainName(pdMatch[1]);
                    if (pdName) {
                        name = pdName;
                        const epMatch = pdName.match(/s?\d{1,2}e(\d{2})/i) || pdName.match(/e(\d{2,3})/i);
                        if (epMatch) {
                            ep = `Tập ${epMatch[1]}`;
                            currentEpisodeLabel = ep; // Cập nhật cho các link tiếp theo (như send.cm)
                        }
                    } else {
                        name = 'Pixeldrain Link';
                    }
                }
            } else if (src.includes('gofile.io')) {
                name = 'Gofile Folder';
            } else if (src.includes('send.cm') || src.includes('send.now')) {
                name = 'Send.cm Link';
            }

            detailedLinks.push({
                episode: ep,
                name: name,
                link: finalLink,
                folderLink: src
            });
        } catch(e) {
            detailedLinks.push({ episode: 'Error', name: e.message, link: src, folderLink: src });
        }
    }

    detailedLinks.sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ ok: true, detailedLinks, rawLinks: links });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/host-folders', async (req, res) => {
  const rows = await require('./utils/hostManager').findUploads({}, { limit: 10 }).catch(()=>[]);
  res.json({ ok: true, info: 'Use hostManager API for folder listing' });
});

router.post('/create-folder', async (req, res) => {
  try {
    const { series, season, host, displayName } = req.body;
    if (!host) return res.status(400).send('host required');
    const folderId = await hostManager.createOrGetFolder(series, season, host, displayName);
    res.json({ ok: true, folderId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/uploads/:id/assign-folder', async (req, res) => {
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
router.post('/crawl-url', async (req, res) => {
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
router.post('/webhook/host-callback', async (req, res) => {
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
router.get('/captcha', async (req, res) => {
  const rows = captchaQueue.listJobs();
  res.json(rows);
});

router.get('/captcha/:id', async (req, res) => {
  const id = req.params.id;
  const job = captchaQueue.getJob(id);
  if (!job) return res.status(404).send('not found');
  res.json({ id: job.id, pageUrl: job.pageUrl, reason: job.reason, status: job.status, screenshotPath: job.screenshotPath });
});

router.get('/captcha/:id/screenshot', async (req, res) => {
  const id = req.params.id;
  const job = captchaQueue.getJob(id);
  if (!job) return res.status(404).send('not found');
  if (!job.screenshotPath) return res.status(404).send('no screenshot');
  res.sendFile(path.resolve(job.screenshotPath));
});

router.post('/captcha/:id/resolve', async (req, res) => {
  const id = req.params.id;
  const ok = captchaQueue.resolveJob(id, req.body || {});
  if (!ok) return res.status(404).send('not found');
  res.json({ ok: true });
});

router.post('/abyss-bulk-sync', async (req, res) => {
    try {
        const { movieId, abyssLines, extractedLinks } = req.body;
        if (!movieId || !abyssLines || !extractedLinks) return res.status(400).send('Missing params');

        const Movie = require('./models/Movie');
        const movie = await Movie.findById(movieId);
        if (!movie) return res.status(404).send('Movie not found');

        const videoHostProviders = require('./utils/videoHostProviders');
        const abyssApi = videoHostProviders.abyssAPI;
        if (!abyssApi) return res.status(400).send('Abyss API not configured');

        let successCount = 0;
        
        // This process can take time (subtitle upload), so we run it in background
        (async () => {
            console.log(`\n🚀 [ADMIN-BULK-SYNC] Bắt đầu đồng bộ ${abyssLines.length} link Abyss cho phim: "${movie.name}"`);
            for (let line of abyssLines) {
                let originalLine = line.trim();
                let slug = originalLine;
                let providedFilename = null;
                
                // If it's a | separated string, the first part is usually the filename
                if (originalLine.includes('|')) {
                    const parts = originalLine.split('|');
                    providedFilename = parts[0].trim();
                }

                // Extract slug from URL if pasted as URL or embedded string
                const urlMatch = originalLine.match(/(?:abyss\.to|hydrax\.net|abyssplayer\.com)\/([a-zA-Z0-9_-]+)/);
                if (urlMatch) {
                    slug = urlMatch[1];
                } else if (originalLine.includes('|')) {
                    const parts = originalLine.split('|');
                    if (parts[1]) {
                        const m = parts[1].match(/\/([a-zA-Z0-9_-]+)$/);
                        if (m) slug = m[1];
                        else slug = parts[1].trim(); // Fallback
                    }
                }
                
                if (!slug || slug.length < 5 || slug.includes('<') || slug.includes(' ')) {
                    console.log(`[Bulk Sync] ⚠️ Bỏ qua dòng không hợp lệ: ${originalLine}`);
                    continue;
                }

                try {
                    let name = providedFilename;
                    
                    // Ask Abyss for the filename if not provided
                    if (!name) {
                        const axios = require('axios');
                        let foundItem = null;
                        for (let page = 1; page <= 3; page++) { // Check up to 3 recent pages
                            const hydraxUrl = `https://api.hydrax.net/${process.env.ABYSS_API_KEY}/list?page=${page}`;
                            const resp = await axios.get(hydraxUrl);
                            if (resp.data && resp.data.items) {
                                foundItem = resp.data.items.find(i => i.slug === slug);
                                if (foundItem) break;
                            }
                        }
                        if (foundItem) name = foundItem.name;
                    }

                    if (name) {
                        // Parse Episode from filename
                        const epMatch = name.match(/s?\d{1,2}e(\d{2,3})/i) || name.match(/e(\d{2,3})/i) || name.match(/T[a-zA-Z\s]*(\d{1,3})/i);
                        let episodeString = null;
                        if (epMatch) {
                            episodeString = `Tập ${parseInt(epMatch[1], 10)}`;
                        } else if (name.includes('Tập')) {
                            const tMatch = name.match(/Tập\s*(\d{1,3})/i);
                            if (tMatch) episodeString = `Tập ${parseInt(tMatch[1], 10)}`;
                        } else {
                            // Fallback, see if it is just a number
                            const numMatch = name.match(/^(\d{1,3})$/);
                            if (numMatch) episodeString = `Tập ${parseInt(numMatch[1], 10)}`;
                        }

                        if (!episodeString) {
                            console.log(`[Bulk Sync] ⚠️ Không nhận diện được tập cho file: ${name}`);
                            continue;
                        }

                        // Map with extractedLinks to get directLink
                        const matchedLinkObj = extractedLinks.find(el => {
                           if (el.episode === episodeString) return true;
                           const epNum = episodeString.replace('Tập ', '');
                           if (el.name && el.name.includes(`E${epNum.padStart(2, '0')}`)) return true;
                           return false;
                        });

                        const directUrl = matchedLinkObj ? matchedLinkObj.link : null;
                        console.log(`[Bulk Sync] Khớp ${episodeString} (${slug}) -> DirectLink: ${directUrl ? 'OK' : 'MISSING'}`);

                        // Add to hostUpload collection for tracking
                        const newUpload = await hostUpload.create({
                            movieId: movie._id,
                            series: movie.name,
                            season: 'S01',
                            episode: episodeString,
                            filename: name,
                            host: 'Abyss',
                            sourcePage: directUrl || 'bulk-sync-manual',
                            status: 'completed',
                            taskId: slug,
                            notes: 'Đồng bộ từ Bulk Sync',
                            createdAt: new Date()
                        });

                        // Sync to Movie DB
                        await hostManager.syncMovieEpisode(newUpload, slug);
                        
                        // Upload subtitle if directUrl exists
                        if (directUrl && directUrl.includes('pixeldrain')) {
                            let realVideoUrl = directUrl;
                            if (realVideoUrl.includes('/u/')) {
                                realVideoUrl = realVideoUrl.replace('/u/', '/api/file/');
                            }
                            console.log(`[Bulk Sync] Đang kích hoạt trích xuất phụ đề cho ${episodeString}...`);
                            await abyssApi.uploadSubtitleFromVideo(realVideoUrl, slug, newUpload._id).catch(e => console.log('Sub error:', e.message));
                        }
                        
                        successCount++;
                    } else {
                        console.log(`[Bulk Sync] ❌ Không tìm thấy thông tin trên Abyss cho ID: ${slug}`);
                    }
                } catch(e) {
                    console.log(`[Bulk Sync] Error for slug ${slug}:`, e.message);
                }
            }
            console.log(`[Bulk Sync] 🎉 Hoàn tất đồng bộ ${successCount} tập phim cho ${movie.name}`);
        })();

        res.json({ ok: true, message: `Hệ thống đã nhận lệnh và đang đồng bộ ngầm.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/play4me-bulk-sync', async (req, res) => {
    try {
        const { movieId, play4meLines, extractedLinks } = req.body;
        if (!movieId || !play4meLines || !extractedLinks) return res.status(400).send('Missing params');

        const Movie = require('./models/Movie');
        const movie = await Movie.findById(movieId);
        if (!movie) return res.status(404).send('Movie not found');

        const videoHostProviders = require('./utils/videoHostProviders');
        const play4meApi = videoHostProviders.play4meAPI;
        if (!play4meApi) return res.status(400).send('Play4Me API not configured');

        const hostUpload = require('./models/HostUpload');

        let successCount = 0;
        
        // This process runs in the background
        (async () => {
            console.log(`\n🚀 [ADMIN-BULK-SYNC] Bắt đầu đồng bộ ${play4meLines.length} link Play4Me cho phim: "${movie.name}"`);
            
            // Create folder for movie on Play4Me
            let folderId = null;
            try {
                folderId = await play4meApi.createFolder(movie.name);
                if (folderId) console.log(`[Bulk Sync] Tạo/Tìm thấy thư mục Play4Me cho phim: ${movie.name} (ID: ${folderId})`);
            } catch(e) {
                console.log(`[Bulk Sync] ⚠️ Không thể tạo thư mục Play4Me:`, e.message);
            }

            for (let line of play4meLines) {
                let directUrl = line.trim();
                if (!directUrl || !directUrl.startsWith('http')) continue;

                // Match with extractedLinks to get episode and name
                const matchedLinkObj = extractedLinks.find(el => el.link === directUrl);
                
                let episodeString = null;
                let filename = 'Video';
                
                if (matchedLinkObj) {
                    episodeString = matchedLinkObj.episode;
                    filename = matchedLinkObj.name;
                } else {
                    console.log(`[Bulk Sync Play4Me] ⚠️ Không tìm thấy link ${directUrl} trong danh sách Extracted Links! Cố đoán tập...`);
                    // Fallback to extract from filename or url
                    const epMatch = directUrl.match(/e(\d+)/i) || directUrl.match(/tap-?(\d+)/i) || directUrl.match(/tập[ -]?(\d+)/i);
                    episodeString = epMatch ? `Tập ${parseInt(epMatch[1])}` : `Tập ?`;
                }

                try {
                    console.log(`[Bulk Sync Play4Me] Bắt đầu Remote Upload: ${episodeString} (${filename})`);
                    // Call Play4Me Remote Upload
                    const taskId = await play4meApi.remoteUpload(directUrl, filename, folderId);
                    
                    if (taskId) {
                        // Add to hostUpload collection for tracking
                        await hostUpload.create({
                            movieId: movie._id,
                            series: movie.name,
                            season: 'S01',
                            episode: episodeString,
                            filename: filename,
                            host: 'Play4Me',
                            sourcePage: directUrl,
                            status: 'processing', // Remote upload takes time, cron will check
                            taskId: taskId,
                            notes: 'Đồng bộ từ Bulk Sync Play4Me',
                            createdAt: new Date()
                        });

                        successCount++;
                    }
                } catch(e) {
                    console.log(`[Bulk Sync Play4Me] Error for ${directUrl}:`, e.message);
                }
            }
            console.log(`[Bulk Sync Play4Me] 🎉 Hoàn tất đẩy ${successCount} tập phim vào hàng đợi Play4Me cho ${movie.name}`);
        })();

        res.json({ ok: true, message: `Hệ thống đã nhận lệnh và đang đồng bộ ngầm lên Play4Me.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
// Trigger nodemon restart
