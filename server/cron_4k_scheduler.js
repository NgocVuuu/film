require('dotenv').config();
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cron = require('node-cron');

const tmdbDiscovery = require('./utils/tmdbDiscovery');
const Movie = require('./models/Movie');
const HostUpload = require('./models/HostUpload');
const { addUploadJob } = require('./utils/queue');
const { crawlSeasonEpisodes } = require('./episodeCrawler');

// Standard English stopwords to prevent false matching on common short words
const STOPWORDS = new Set([
  'the', 'and', 'of', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 
  'with', 'by', 'from', 'about', 'as', 'into', 'like', 'through', 
  'after', 'over', 'between', 'out', 'against', 'during', 'without', 
  'before', 'under', 'around', 'among'
]);

// Connect Mongoose if not active
async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';
  console.log(`[DB] Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
}

// Normalize name for matching
function cleanName(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Check if a PChill movie has completed its 4K crawl
function checkPChillCompletion(movie) {
  let maxFreeEpisodes = 0;
  let pchillEpisodes = 0;

  if (movie.episodes && Array.isArray(movie.episodes)) {
    for (const server of movie.episodes) {
      if (server.server_name === 'PChill Server') {
        pchillEpisodes = server.server_data ? server.server_data.length : 0;
      } else {
        const count = server.server_data ? server.server_data.length : 0;
        if (count > maxFreeEpisodes) {
          maxFreeEpisodes = count;
        }
      }
    }
  }

  // Also check if episode_total is set and matches
  const totalExpected = parseInt(movie.episode_total) || 0;
  let isComplete = maxFreeEpisodes > 0 && pchillEpisodes >= maxFreeEpisodes;
  if (totalExpected > 0 && pchillEpisodes >= totalExpected) {
    isComplete = true;
  }

  return {
    isComplete,
    pchillEpisodes,
    maxFreeEpisodes: Math.max(maxFreeEpisodes, totalExpected)
  };
}

// Find a TMDB drama in the PChill database
async function findMovieInDb(tmdbItem) {
  const tmdbName = cleanName(tmdbItem.name);
  const tmdbOriginalName = cleanName(tmdbItem.original_name);

  // 1. Try exact matches on origin_name or name
  let matchedMovie = await Movie.findOne({
    $or: [
      { origin_name: { $regex: new RegExp(`^${tmdbItem.original_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
      { name: { $regex: new RegExp(`^${tmdbItem.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } }
    ]
  });

  if (matchedMovie) return matchedMovie;

  // 2. Try partial regex search and normalize match
  const queryWords = tmdbItem.name.split(/\s+/).filter(w => w.length > 2);
  const origWords = tmdbItem.original_name.split(/\s+/).filter(w => w.length > 2);

  const matchRegexes = [];
  if (queryWords.length > 0) matchRegexes.push({ name: { $regex: new RegExp(queryWords.join('|'), 'i') } });
  if (origWords.length > 0) matchRegexes.push({ origin_name: { $regex: new RegExp(origWords.join('|'), 'i') } });

  if (matchRegexes.length === 0) return null;

  const candidates = await Movie.find({ $or: matchRegexes }).limit(30).lean();

  for (const m of candidates) {
    const dbNameClean = cleanName(m.name);
    const dbOrigClean = cleanName(m.origin_name);

    if (dbOrigClean === tmdbOriginalName || dbNameClean === tmdbName || dbOrigClean === tmdbName || dbNameClean === tmdbOriginalName) {
      return await Movie.findById(m._id);
    }
  }

  return null;
}

// Search for mkvdrama season/movie URL on .org and .net
async function searchMkvDrama(browser, movie) {
  if (movie.mkvUrl && (movie.mkvUrl.includes('mkvdrama.org') || movie.mkvUrl.includes('mkvdrama.net'))) {
    console.log(`[MKV-SEARCH] Using direct pre-configured URL for "${movie.name}": ${movie.mkvUrl}`);
    return movie.mkvUrl;
  }

  const queries = [];
  
  if (movie.origin_name) {
    // Split by comma or semicolon to handle alternative titles separately
    const parts = movie.origin_name.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    queries.push(...parts);
  }
  if (movie.name && movie.name !== movie.origin_name) {
    queries.push(movie.name);
  }

  for (const query of queries) {
    const cleanQuery = query.replace(/\(\d{4}\)/g, '').trim();
    if (!cleanQuery) continue;

    console.log(`[MKV-SEARCH] Searching on mkvdrama.org for: "${cleanQuery}"`);
    const page = await browser.newPage();
    const searchUrl = `https://mkvdrama.org/?s=${encodeURIComponent(cleanQuery)}`;

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(a => ({
          href: a.href,
          text: a.innerText || '',
          title: a.getAttribute('title') || ''
        }));
      });
      await page.close();

      const qClean = cleanName(cleanQuery);
      const qWords = qClean.split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
      const candidates = [];

      for (const link of links) {
        if (!link.href || (!link.text && !link.title)) continue;
        const u = link.href.toLowerCase();
        
        // Skip common navigation/archive links
        if (u.includes('/category/') || u.includes('/tag/') || u.includes('/page/') || u.includes('?s=')) continue;
        if (u === 'https://mkvdrama.org' || u === 'https://mkvdrama.org/' || u === 'https://mkvdrama.net' || u === 'https://mkvdrama.net/') continue;
        
        // Enforce post URL pattern
        if (!/\/\d+-[a-z0-9]/i.test(link.href)) continue;

        const textClean = cleanName(link.text || link.title);
        if (textClean.length < 4) continue;

        const tWords = textClean.split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
        const qSet = new Set(qWords);
        
        let common = 0;
        for (const w of tWords) {
          if (qSet.has(w)) common++;
        }
        
        const queryCoverage = qWords.length > 0 ? (common / qWords.length) : 0;
        const titleCoverage = tWords.length > 0 ? (common / tWords.length) : 0;
        
        // Ensure at least 40% query overlap OR exact substring match of reasonably long queries
        if (queryCoverage >= 0.4 || titleCoverage >= 0.4 || (textClean.includes(qClean) && qClean.length > 4) || (qClean.includes(textClean) && textClean.length > 4)) {
          candidates.push({ href: link.href, score: Math.max(queryCoverage, titleCoverage) });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const bestLink = candidates[0].href;
        console.log(`[MKV-SEARCH] Success: ${bestLink} (Score: ${candidates[0].score})`);
        return bestLink;
      }
    } catch (e) {
      console.error(`[MKV-SEARCH] Search error on .org: ${e.message}`);
      if (!page.isClosed()) await page.close();
    }
  }

  // Fallback to mkvdrama.net
  for (const query of queries) {
    const cleanQuery = query.replace(/\(\d{4}\)/g, '').trim();
    if (!cleanQuery) continue;

    console.log(`[MKV-SEARCH] Fallback: Searching on mkvdrama.net for: "${cleanQuery}"`);
    const page = await browser.newPage();
    const searchUrl = `https://mkvdrama.net/?s=${encodeURIComponent(cleanQuery)}`;

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(a => ({
          href: a.href,
          text: a.innerText || '',
          title: a.getAttribute('title') || ''
        }));
      });
      await page.close();

      const qClean = cleanName(cleanQuery);
      const qWords = qClean.split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
      const candidates = [];

      for (const link of links) {
        if (!link.href || (!link.text && !link.title)) continue;
        const u = link.href.toLowerCase();
        
        if (u.includes('/category/') || u.includes('/tag/') || u.includes('/page/') || u.includes('?s=')) continue;
        if (u === 'https://mkvdrama.org' || u === 'https://mkvdrama.org/' || u === 'https://mkvdrama.net' || u === 'https://mkvdrama.net/') continue;
        
        if (!/\/\d+-[a-z0-9]/i.test(link.href)) continue;

        const textClean = cleanName(link.text || link.title);
        if (textClean.length < 4) continue;

        const tWords = textClean.split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
        const qSet = new Set(qWords);
        
        let common = 0;
        for (const w of tWords) {
          if (qSet.has(w)) common++;
        }
        
        const queryCoverage = qWords.length > 0 ? (common / qWords.length) : 0;
        const titleCoverage = tWords.length > 0 ? (common / tWords.length) : 0;
        
        if (queryCoverage >= 0.4 || titleCoverage >= 0.4 || (textClean.includes(qClean) && qClean.length > 4) || (qClean.includes(textClean) && textClean.length > 4)) {
          candidates.push({ href: link.href, score: Math.max(queryCoverage, titleCoverage) });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const bestLink = candidates[0].href;
        console.log(`[MKV-SEARCH] Success (fallback net): ${bestLink} (Score: ${candidates[0].score})`);
        return bestLink;
      }
    } catch (e) {
      console.error(`[MKV-SEARCH] Fallback error on .net: ${e.message}`);
      if (!page.isClosed()) await page.close();
    }
  }

  return null;
}

// Queue an episode if not already processing/completed
async function queueEpisodeIfNew(movie, epUrl, dryRun = false) {
  const existing = await HostUpload.findOne({
    movieId: movie._id,
    sourcePage: epUrl,
    status: { $in: ['pending', 'processing', 'completed'] }
  });

  if (existing) {
    console.log(`  [-] Tập phim đã có trong HostUpload (${existing.status}): ${epUrl}`);
    return false;
  }

  const jobData = {
    sourceUrl: epUrl,
    movieId: movie._id.toString(),
    showName: movie.name
  };

  if (dryRun) {
    console.log(`  [DRY-RUN] Sẽ đẩy tập vào Queue: ${epUrl}`);
  } else {
    await addUploadJob(jobData);
    console.log(`  [+] Đã đẩy tập thành công vào Queue: ${epUrl}`);
  }
  return true;
}

// MAIN DAILY SCHEDULER
async function runDailyScheduler(options = {}) {
  const dryRun = options.dryRun || false;
  console.log("\n=========================================");
  console.log(`🚀 [DAILY-SCHEDULER] Bắt đầu chạy lập lịch 4K... Chế độ: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log("=========================================\n");

  let browser;
  try {
    await connectDb();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    // -------------------------------------------------------------
    // PHẦN 1: QUÉT & CẬP NHẬT CÁC PHIM ĐANG CHIẾU / CÀO DỞ (ONGOING TRACKING)
    // -------------------------------------------------------------
    console.log("--- [PHẦN 1] Tìm kiếm & Cập nhật các phim đang cào dở / đang phát sóng ---");
    const ongoingMovies = await Movie.find({
      $or: [
        { status: 'ongoing' },
        { 'episodes.server_name': 'PChill Server' }
      ],
      isActive: { $ne: false }
    });

    console.log(`🔎 Tìm thấy ${ongoingMovies.length} phim ứng viên đang chiếu hoặc đã từng cào 4K.`);
    
    for (const movie of ongoingMovies) {
      const { isComplete, pchillEpisodes, maxFreeEpisodes } = checkPChillCompletion(movie);
      
      // Nếu đã cào hoàn thành 4K thì bỏ qua
      if (isComplete) {
        console.log(`  [Skip] Phim "${movie.name}" đã hoàn thành cào 4K (${pchillEpisodes}/${maxFreeEpisodes} tập).`);
        continue;
      }

      console.log(`  [Process] Phát hiện phim cào dở: "${movie.name}" (${pchillEpisodes}/${maxFreeEpisodes} tập 4K). Tiến hành quét thêm tập...`);
      const seasonUrl = await searchMkvDrama(browser, movie);
      
      if (!seasonUrl) {
        console.log(`  [Warning] Không tìm thấy link mkvdrama cho: "${movie.name}"`);
        continue;
      }

      const epUrls = await crawlSeasonEpisodes(seasonUrl);
      console.log(`  [Info] Quét được ${epUrls.length} tập từ mkvdrama.`);
      
      let queuedCount = 0;
      for (const epUrl of epUrls) {
        const ok = await queueEpisodeIfNew(movie, epUrl, dryRun);
        if (ok) queuedCount++;
      }
      console.log(`  [Result] Đã xếp hàng ${queuedCount} tập mới cho "${movie.name}".`);
    }

    // -------------------------------------------------------------
    // PHẦN 2: QUÉT 2 BỘ PHIM HOT TMDB TRUNG-HÀN MỚI
    // -------------------------------------------------------------
    console.log("\n--- [PHẦN 2] Tìm kiếm 2 bộ phim TMDB Hot (Trung, Hàn) mới để cào 4K ---");
    
    // Lấy phim trending TV và Movies của TMDB
    const tvShows = await tmdbDiscovery.getTrendingAsianDramas(1);
    const movies = await tmdbDiscovery.getTrendingAsianMovies(1);
    
    // Trộn chung, ưu tiên TV Shows
    const candidates = [...tvShows, ...movies];
    console.log(`🔎 Quét được tổng cộng ${candidates.length} phim Hot từ TMDB.`);

    let selectedCount = 0;
    const selectedDramas = [];

    for (const item of candidates) {
      if (selectedCount >= 2) break;

      // 1. Kiểm tra quốc gia (chỉ Trung Quốc CN, Đài Loan TW, Hồng Kông HK, Hàn Quốc KR)
      const originCountry = item.origin_country || [];
      const isAsianDrama = originCountry.some(c => ['KR', 'CN', 'TW', 'HK'].includes(c));
      
      if (!isAsianDrama) continue;

      // 2. Tìm kiếm trong cơ sở dữ liệu PChill (phải tồn tại thông tin từ nguồn free)
      const dbMovie = await findMovieInDb(item);
      if (!dbMovie) {
        // console.log(`  [-] Bỏ qua "${item.name || item.title}" do chưa có trong DB PChill.`);
        continue;
      }

      // 3. Kiểm tra xem đã cào 4K hoàn tất chưa
      const { isComplete, pchillEpisodes, maxFreeEpisodes } = checkPChillCompletion(dbMovie);
      if (isComplete) {
        // console.log(`  [-] Bỏ qua "${dbMovie.name}" do đã hoàn tất cào 4K.`);
        continue;
      }

      // 4. Tìm kiếm liên kết Season/Phim trên mkvdrama
      console.log(`  [Selected Candidate] Đang đối chiếu phim hot: "${dbMovie.name}" (${dbMovie.origin_name})`);
      const seasonUrl = await searchMkvDrama(browser, dbMovie);
      
      if (!seasonUrl) {
        console.log(`  [Warning] Không tìm thấy link mkvdrama cho candidate: "${dbMovie.name}"`);
        continue;
      }

      // Đã đủ điều kiện! Chọn bộ phim này
      selectedDramas.push({ dbMovie, seasonUrl });
      selectedCount++;
      console.log(`  ✅ [CHỌN PHIM #${selectedCount}] Đã chọn thành công phim "${dbMovie.name}". Link: ${seasonUrl}`);
    }

    // Tiến hành cào tập và xếp hàng các phim đã chọn
    console.log(`\n📦 Bắt đầu cào tập cho ${selectedDramas.length} phim đã được lựa chọn mới...`);
    for (const selection of selectedDramas) {
      const { dbMovie, seasonUrl } = selection;
      const epUrls = await crawlSeasonEpisodes(seasonUrl);
      console.log(`  [*] Phim: "${dbMovie.name}" - Quét được ${epUrls.length} tập.`);
      
      let queuedCount = 0;
      for (const epUrl of epUrls) {
        const ok = await queueEpisodeIfNew(dbMovie, epUrl, dryRun);
        if (ok) queuedCount++;
      }
      console.log(`  [Result] Đã xếp hàng cào 4K ${queuedCount}/${epUrls.length} tập cho "${dbMovie.name}".`);
    }

    console.log("\n=========================================");
    console.log("✅ [DAILY-SCHEDULER] HOÀN TẤT TRÌNH LẬP LỊCH THÀNH CÔNG!");
    console.log("=========================================\n");

  } catch (error) {
    console.error("❌ [DAILY-SCHEDULER] LỖI TIẾN TRÌNH LẬP LỊCH:", error);
  } finally {
    if (browser) await browser.close();
    // Only disconnect if running directly
    if (require.main === module) {
      await mongoose.disconnect();
    }
  }
}

// THIẾT LẬP CRON JOB CHẠY HẰNG NGÀY LÚC 1:00 AM
cron.schedule('0 1 * * *', async () => {
  console.log('[CRON-TRIGGER] Bắt đầu kích hoạt cào 4K tự động lúc 1:00 AM...');
  await runDailyScheduler({ dryRun: false });
});

// Hỗ trợ chạy trực tiếp bằng dòng lệnh
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  runDailyScheduler({ dryRun: isDryRun });
}

module.exports = { runDailyScheduler };
