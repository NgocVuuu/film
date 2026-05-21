const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createJob } = require('./utils/captchaQueue');
const { fetchWithFlareSolverr } = require('./utils/flareSolverr');
const cheerio = require('cheerio');
puppeteer.use(StealthPlugin());

async function crawlSeasonEpisodes(seasonUrl) {
  // Use a non-headless browser instance and better args to mimic a real user.
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests,IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  // Navigate and give site time to show any bot-check (Cloudflare Turnstile)
  await page.goto(seasonUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 4000));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 15000));
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await new Promise(r => setTimeout(r, 2000));

  // Detect Cloudflare / Turnstile protection. If present, create a captcha job for human-in-loop.
  try {
    const title = await page.title();
    const frames = page.frames();
    const cfFrame = frames.find(f => (f.url() || '').toLowerCase().includes('cloudflare') || (f.url() || '').toLowerCase().includes('turnstile'));

    if ((title && title.toLowerCase().includes('just a moment')) || cfFrame) {
      console.log('[episodeCrawler] Detected Cloudflare / Turnstile on', seasonUrl);

      // Try FlareSolverr first if available
      try {
        const fsRes = await fetchWithFlareSolverr(seasonUrl, { maxTimeout: 60000 });
        if (fsRes && fsRes.ok && fsRes.html) {
          console.log('[episodeCrawler] FlareSolverr succeeded, parsing HTML fallback.');
          const $ = cheerio.load(fsRes.html);
          const anchors = [];
          $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text() || '';
            if (href) anchors.push({ href, text });
          });
          const candidates = [];
          for (const a of anchors) {
            const t = (a.text || '').toLowerCase();
            if (!a.href) continue;
            if (/s\d{1,2}e\d{1,2}/i.test(a.href) || /s\d{1,2}e\d{1,2}/i.test(t) || t.includes('episode') || t.match(/ep\s?\d{1,3}/i)) {
              candidates.push(a.href);
            }
          }
          const unique = Array.from(new Set(candidates));
          await browser.close().catch(()=>{});
          return unique;
        } else {
          console.log('[episodeCrawler] FlareSolverr failed or returned no html:', fsRes && fsRes.error);
        }
      } catch (e) {
        console.log('[episodeCrawler] FlareSolverr error:', e.message);
      }

      // fallback to human-in-loop captcha job
      const screenshot = await page.screenshot({ fullPage: true }).catch(()=>null);
      const { id, promise } = createJob({ pageUrl: seasonUrl, reason: 'cloudflare', screenshotBuffer: screenshot });
      console.log(`[episodeCrawler] Created captcha job ${id}, waiting for human resolution (timeout 10m)...`);

      try {
        // wait for human to resolve (promise resolves when admin calls resolveJob)
        await Promise.race([
          promise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('captcha timeout')), 10 * 60 * 1000))
        ]);
        console.log('[episodeCrawler] Captcha resolved, continuing...');
        // give site a moment to update after resolution
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.log('[episodeCrawler] Captcha not resolved or timed out:', err.message);
        await browser.close().catch(()=>{});
        return [];
      }
    }
  } catch (e) {
    // continue even if detection check fails
    console.warn('[episodeCrawler] Cloudflare detection error', e.message);
  }

  // heuristics: collect anchors that look like episode links (contain s01e01 or episode)
  const anchors = await page.$$eval('a', els => els.map(a => ({ href: a.href, text: a.innerText })));
  const candidates = [];
  for (const a of anchors) {
    const t = (a.text || '').toLowerCase();
    if (!a.href) continue;
    if (/s\d{1,2}e\d{1,2}/i.test(a.href) || /s\d{1,2}e\d{1,2}/i.test(t) || t.includes('episode') || t.match(/ep\s?\d{1,3}/i)) {
      candidates.push(a.href);
    }
  }

  // dedupe and return
  const unique = Array.from(new Set(candidates));
  await browser.close().catch(()=>{});
  return unique;
}

module.exports = { crawlSeasonEpisodes };
