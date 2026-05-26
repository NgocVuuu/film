const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { PremiumHostService, AbyssHostService, play4meAPI, abyssAPI } = require('./utils/videoHostProviders');
const gofileService = require('./utils/gofileService');
const hostManager = require('./utils/hostManager');
const tmdbService = require('./utils/tmdbService');
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

// API Clients
const play4me = new PremiumHostService('Play4Me', 'https://player4me.com', process.env.PLAY4ME_API_KEY);
const abyssService = abyssAPI;
const axios = require('axios');

// --- BACKGROUND QUEUE FOR SLOW HOSTS (ABYSS) ---
const abyssUploadQueue = [];
let isAbyssUploading = false;

async function processAbyssQueue() {
    if (isAbyssUploading) return;
    isAbyssUploading = true;
    try {
        while(abyssUploadQueue.length > 0) {
            const job = abyssUploadQueue.shift();
            try {
                console.log(`\n[Abyss Queue] Bắt đầu đẩy: ${job.finalFilename}... (Còn ${abyssUploadQueue.length} tập ở hàng đợi)`);
                const folderId = await hostManager.createOrGetFolder(job.seriesName, job.seasonName, job.hostKey, job.folderName);
                const res = await hostManager.remoteUploadWithRetry(job.hostKey, job.directLinkToUpload, job.finalFilename, folderId);
                
                if (res.ok) {
                    console.log(`[Abyss Queue] ✅ Xong! Task ID: ${res.taskId}`);
                    const doc = await hostManager.recordUpload({ 
                        series: job.seriesName, season: job.seasonName, episode: job.episodeName, tmdbId: job.tmdbId, 
                        movieId: job.localMovieId,
                        sourcePage: job.viewcrateUrl, sourceDirectUrl: job.directLinkToUpload, filename: job.finalFilename, 
                        host: job.hostKey, taskId: res.taskId, status: 'pending', retries: res.attempts - 1 
                    });
                    hostManager.pollAndSyncStatus(abyssAPI, res.taskId, doc._id).catch(()=>{});
                } else {
                    throw new Error(res.error || 'upload failed');
                }
            } catch (e) {
                console.log(`[Abyss Queue] ❌ Lỗi upload tập ${job.episodeName}: ${e.message}`);
                try {
                    await hostManager.recordUpload({ 
                        series: job.seriesName, season: job.seasonName, episode: job.episodeName, sourcePage: job.viewcrateUrl, 
                        sourceDirectUrl: job.directLinkToUpload, filename: job.finalFilename, host: job.hostKey, taskId: null, status: 'failed', notes: e.message 
                    });
                } catch(dbErr) {
                    console.log(`[Abyss Queue] Lỗi lưu DB khi failed:`, dbErr.message);
                }
            }
        }
    } finally {
        isAbyssUploading = false;
        console.log(`\n[Abyss Queue] 🎉 Đã xử lý xong toàn bộ hàng đợi!`);
    }
}

// -- 1. SETUP FAKE JDOWNLOADER SERVER --
const app = express();
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get('/jdcheck.js', (req, res) => {
    res.send("jdownloader=true; var version='16282';");
});

app.get('/flash/', (req, res) => {
    res.send("JDownloader");
});

// Setup Promise to catch links
let resolveCnlLinks;
let cnlLinksPromise;

function resetCnlPromise() {
    cnlLinksPromise = new Promise(resolve => resolveCnlLinks = resolve);
}
resetCnlPromise();

app.post('/flash/addcrypted2', (req, res) => {
    console.log("\n📥 [FAKE-JD] Đã bắt được dữ liệu Click'n'Load!");
    const crypted = req.body.crypted;
    const jk = req.body.jk;

    try {
        const keyStr = eval(`(${jk})()`);
        const key = Buffer.from(keyStr, 'hex');

        const cryptedBuffer = Buffer.from(crypted, 'base64');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, key);
        decipher.setAutoPadding(false); // Quan trọng
        
        let decrypted = decipher.update(cryptedBuffer, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        // Bỏ ký tự null \x00, split tách dòng
        const links = decrypted.replace(/\x00/g, '').split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
        
        console.log(`🔓 [FAKE-JD] Giải mã được ${links.length} link Click'n'Load!`);
        if (resolveCnlLinks) resolveCnlLinks(links);

    } catch(e) {
        console.error("❌ Lỗi giải mã:", e.message);
        if (resolveCnlLinks) resolveCnlLinks([]);
    }

    res.send("success");
});

// Hàm hỗ trợ giả lập vuốt chuột
async function simulateHumanMouse(page) {
    for (let i = 0; i < 3; i++) {
        const x = Math.floor(Math.random() * 600) + 100;
        const y = Math.floor(Math.random() * 400) + 100;
        await page.mouse.move(x, y);
        await new Promise(r => setTimeout(r, Math.random() * 300));
    }
}

// Bắt đầu chu trình tự động
async function runAutoUploadPipeline(jobData) {
    let movieUrl = typeof jobData === 'string' ? jobData : jobData.sourceUrl;
    let localMovieId = typeof jobData === 'object' ? jobData.movieId : null;
    const forceUpload = typeof jobData === 'object' ? !!jobData.forceUpload : false;
    const targetEpisode = typeof jobData === 'object' ? jobData.targetEpisode : null;
    let targetMovie = null;

    const sanitizeName = (v = '') => String(v)
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const escapeRegex = (v = '') => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const toTitleFromSlug = (v = '') => sanitizeName(String(v).replace(/^\d+-/, '').replace(/[-_.]+/g, ' '));

    if (!movieUrl) {
        console.error("â Œ [ERROR] No movieUrl provided to pipeline");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');

        if (localMovieId) {
            targetMovie = await Movie.findById(localMovieId);
        }

        // If movieId not provided, try to map from existing DB records (prefer KKPhim links / mkvUrl)
        if (!targetMovie && movieUrl) {
            const noSlash = movieUrl.replace(/\/+$/, '');
            const lastSeg = noSlash.split('/').filter(Boolean).pop() || '';
            const altSlug = lastSeg.replace(/^\d+-/, '');
            const titleFromSlug = toTitleFromSlug(lastSeg);
            const titleFromAltSlug = toTitleFromSlug(altSlug);
            targetMovie = await Movie.findOne({
                $or: [
                    { mkvUrl: movieUrl },
                    { mkvUrl: noSlash },
                    { 'episodes.server_data.link_embed': movieUrl },
                    { 'episodes.server_data.link_embed': noSlash },
                    { slug: lastSeg },
                    { slug: altSlug },
                    { origin_name: { $regex: `^${escapeRegex(titleFromSlug)}$`, $options: 'i' } },
                    { origin_name: { $regex: `^${escapeRegex(titleFromAltSlug)}$`, $options: 'i' } },
                    { name: { $regex: `^${escapeRegex(titleFromSlug)}$`, $options: 'i' } },
                    { name: { $regex: `^${escapeRegex(titleFromAltSlug)}$`, $options: 'i' } }
                ]
            });
            if (targetMovie) {
                localMovieId = targetMovie._id;
                console.log(`[DB] Mapped source URL -> movie: ${targetMovie.origin_name || targetMovie.name} (${targetMovie._id})`);
            }
        }

        if (localMovieId && !targetMovie) {
            console.error(`â Œ [SKIP] Phim vá»›i ID ${localMovieId} khÃ´ng tá»“n táº¡i trong Database. Skip lÃ¢y phim cÃ¡c bÆ°á»›c tiáº¿p theo!`);
            throw new Error('Movie not found in DB');
        }

    } catch (e) {
        if (e.message === 'Movie not found in DB') throw e;
        console.error('DB connect error:', e.message);
    }

    let browser;
    let server;
    let extractedLinks = [];
    let viewcrateUrl = null;

    try {
        const isDirectLinkMatch = movieUrl.match(/https?:\/\/(?:www\.)?(?:gofile\.io\/d\/[A-Za-z0-9]+|pixeldrain\.com\/u\/[A-Za-z0-9]+|send\.now\/[A-Za-z0-9]+|send\.cm\/[A-Za-z0-9]+)/i);

        if (isDirectLinkMatch) {
            console.log(`✅ Phát hiện link trực tiếp (Direct Link): ${movieUrl}. Bỏ qua bước cào Mkvdrama/Viewcrate.`);
            extractedLinks = [movieUrl];
        } else {
            server = app.listen(9666, '127.0.0.1', () => {
                console.log("\n✅ [1] Server Fake JDownloader đang chờ ở cổng 9666 (IPv4 127.0.0.1)...\n");
            });

        console.log("✅ [2] Mở trình duyệt ẩn danh Puppeteer...");
        browser = await puppeteer.launch({ 
            headless: true, // Chạy nền trên Server VPS
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-notifications', // Tự động chặn các thông báo dạng "Show notifications"
                '--disable-popup-blocking',
                '--disable-web-security',
                '--disable-features=BlockInsecurePrivateNetworkRequests,IsolateOrigins,site-per-process'
            ] 
        });

        const page = await browser.newPage();
        
        // Khóa luồng điều hướng toàn cục để chống quảng cáo tự redirect trang chính
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
                const u = req.url();
                if (u !== 'about:blank' && !u.includes('viewcrate') && !u.includes('filecrypt') && !u.includes('ouo') && !u.includes('mkvdrama') && !u.includes('google') && !u.includes('recaptcha') && !u.includes('turnstile')) {
                    console.log(`🚫 Đã chặn trang chính tự chuyển hướng sang quảng cáo: ${u}`);
                    req.abort('aborted');
                    return;
                }
            }
            req.continue();
        });

        // ---- BƯỚC 1: LẤY LINK OUO 2160P ----
        let viewcratePage = null;

        if (movieUrl.includes('viewcrate')) {
            console.log(`✅ Phát hiện link đích là Viewcrate, bỏ qua bước vượt Ouo...`);
            await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            viewcratePage = page;
        } else {
            // ---- BƯỚC 1: LẤY LINK OUO 2160P ----
            console.log(`👉 Đi tới trang phim Mkvdrama: ${movieUrl}`);
            await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            console.log(`🔄 Khắc phục lỗi 404/Block: Đợi 4s rồi Reload lại trang...`);
            await new Promise(r => setTimeout(r, 4000));
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log(`⏳ Đang tìm link... Do web thiết lập độ trễ nên sẽ chờ 15s...`);

            // Đợi 15s cho web đếm ngược (nếu có)
            await new Promise(r => setTimeout(r, 15000));
            
            // Cuộn xuống để kích hoạt lazyload nếu web yêu cầu
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 2000));

            const ouoLink = await page.evaluate(() => {
                const allLinks = Array.from(document.querySelectorAll('a'));
                const link1s = allLinks.filter(a => a.innerText.toLowerCase().includes('link 1') || a.innerText.toLowerCase().includes('ouo'));
                
                // Ưu tiên 2160p / 4k
                for (let a of link1s) {
                    const rowText = a.closest('tr')?.innerText.toLowerCase() || (a.parentElement && a.parentElement.innerText.toLowerCase()) || '';
                    if (rowText.includes('2160') || rowText.includes('4k')) return a.href;
                }
                // Ưu tiên 1080p
                for (let a of link1s) {
                    const rowText = a.closest('tr')?.innerText.toLowerCase() || (a.parentElement && a.parentElement.innerText.toLowerCase()) || '';
                    if (rowText.includes('1080')) return a.href;
                }
                
                if(link1s.length > 0) return link1s[0].href;
                return null;
            });

            if (!ouoLink) {
                throw new Error("❌ Không tìm thấy link nào nhãn Link 1 trên trang!");
            }
            console.log(`✅ [3] Đã phát hiện Link tải: ${ouoLink}`);

            // ---- BƯỚC 2: VƯỢT OUO ĐỂ TỚI VIEWCRATE ----
            console.log(`👉 Truy cập Ouo vòng 1...`);
            await page.goto(ouoLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            console.log(`⏳ Đang chạy Auto-Skip quảng cáo Ouo.io...`);
        }

        resetCnlPromise();

        // CƠ CHẾ CHẶN POPUP THÔNG MINH: Bắt sự kiện tạo trang mới và đóng nếu là web khác
        const targetCreatedHandler = async (target) => {
            if (target.type() === 'page') {
                try {
                    const newPage = await target.page();
                    if (!newPage) return;
                    
                    // Khóa điều hướng nội bộ để chống ad redirect
                    try {
                        await newPage.setRequestInterception(true);
                        newPage.on('request', req => {
                            if (req.isNavigationRequest() && req.frame() === newPage.mainFrame()) {
                                const u = req.url();
                                if (!u.includes('viewcrate') && !u.includes('filecrypt') && !u.includes('ouo') && !u.includes('mkvdrama') && u !== 'about:blank') {
                                    console.log(`🚫 Đã chặn popup tự chuyển hướng sang quảng cáo: ${u}`);
                                    req.abort('aborted');
                                    return;
                                }
                            }
                            req.continue();
                        });
                    } catch(e) {}
                    newPage.on('framenavigated', async (frame) => {
                        if (frame === newPage.mainFrame()) {
                            const u = newPage.url();
                            // Nếu là popup CNl bridge của Viewcrate thì cố gắng auto Allow
                            if (u && u.includes('viewcrate') && u.includes('cnl_bridge')) {
                                console.log(`🔔 Phát hiện popup CNL bridge: ${u.substring(0, 80)}... Thử auto-allow`);
                                try {
                                    await newPage.waitForTimeout(800);
                                    await newPage.evaluate(() => {
                                        const btns = Array.from(document.querySelectorAll('button'));
                                        for (const b of btns) {
                                            if ((b.innerText||'').toLowerCase().includes('allow') || (b.innerText||'').toLowerCase().includes('cho phép')) {
                                                b.click();
                                            }
                                        }
                                    });
                                } catch(e) {}
                                return;
                            }

                            if (u && u !== 'about:blank' && !u.includes('ouo.io') && !u.includes('ouo.press') && !u.includes('viewcrate') && !u.includes('filecrypt') && !u.includes('mkvdrama')) {
                                console.log(`🗑 Chặn từ trứng nước popup rác: ${u.substring(0, 40)}...`);
                                await newPage.close().catch(()=>{});
                            }
                        }
                    });

                    // Chờ 2.5s, nếu tab vẫn mở mà không phải web đích thì đóng (chống popup about:blank hoặc ad ngầm)
                    setTimeout(async () => {
                        try {
                            if (!newPage.isClosed()) {
                                const u = newPage.url();
                                if (!u.includes('viewcrate') && !u.includes('filecrypt') && !u.includes('mkvdrama') && !u.includes('ouo')) {
                                    console.log(`🗑 Dọn dẹp tab rác (ad popup): ${u}`);
                                    await newPage.close().catch(()=>{});
                                }
                            }
                        } catch(e){}
                    }, 2500);
                } catch(e) {}
            }
        };
        browser.on('targetcreated', targetCreatedHandler);

        // Vòng lặp tìm và bấm nút liên tục (chỉ chạy nếu chưa tới viewcrate)
        if (!viewcratePage) {
            for (let i = 0; i < 30; i++) {
            // Kiểm tra xem đã tới đích ViewCrate chưa
            const currentPages = await browser.pages();
            viewcratePage = currentPages.find(p => p.url().includes('viewcrate') || p.url().includes('filecrypt'));
            if (viewcratePage) {
                console.log("✅ Đã xuyên thủng Ouo tới trang đích (Viewcrate/Filecrypt)!");
                await viewcratePage.bringToFront();
                break;
            }

            // Lấy lại tab Ouo để tương tác
            const ouoPage = currentPages.find(p => p.url().includes('ouo.io') || p.url().includes('ouo.press'));
            if (ouoPage) {
                await ouoPage.bringToFront();
                try {
                    // Xem có iframe Cloudflare / Captcha không
                    const isCaptcha = await ouoPage.evaluate(() => document.body.innerHTML.includes('cf-turnstile') || document.body.innerHTML.includes('g-recaptcha'));
                    if (isCaptcha) {
                        console.log("🤖 Gặp chốt chặn Captcha trên Ouo, thử hành vi nhân tạo...");
                        await simulateHumanMouse(ouoPage);
                        // If repeated attempts fail, escalate to human-in-loop after several tries
                        if (i >= 8) {
                            try {
                                const captchaQueue = require('./utils/captchaQueue');
                                const ss = await ouoPage.screenshot({ fullPage: false });
                                const htmlSnippet = await ouoPage.evaluate(() => document.body.innerText.slice(0, 400));
                                const job = captchaQueue.createJob({ pageUrl: ouoPage.url(), reason: 'ouo_captcha', screenshotBuffer: ss, htmlSnippet });
                                console.log(`🛑 Captcha required. Created job ${job.id}. Visit Admin API /admin/captcha to resolve.`);
                                // Wait up to 10 minutes for resolution
                                const resolved = await Promise.race([
                                    job.promise,
                                    new Promise(r => setTimeout(() => r(null), 10 * 60 * 1000))
                                ]);
                                if (!resolved) {
                                    console.log('⏳ Captcha job timed out after 10 minutes, continuing attempts...');
                                } else {
                                    console.log('✅ Captcha job resolved by human, resuming flow.');
                                }
                            } catch(e) { console.log('⚠️ Lỗi khi tạo captcha job:', e.message); }
                        }
                    }

                    // Cuộn qua đống banner Ads che mất nút
                    await ouoPage.evaluate(() => window.scrollBy(0, document.body.scrollHeight / 4));

                    const btn = await ouoPage.$('#btn-main, .btn-main');
                    if (btn) {
                        console.log(`🖱 Đang bấm nút Skip / Human bằng kĩ thuật lách Overlay...`);
                        // Dùng evaluate click trực tiếp vào DOM thay vì dùng chuột để xuyên qua lớp quảng cáo tàng hình
                        await ouoPage.evaluate(b => b.click(), btn).catch(()=>{});
                    }
                } catch(e) {}
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        } // End of if (!viewcratePage)

        if (!viewcratePage) {
            console.log("⚠️ CẢNH BÁO: Thuật toán Bypass chưa thể xuyên thủng do IP bị dính Captcha hình ảnh. Bạn vui lòng thao tác nốt bằng tay trên tab Chromium nhé, server vẫn đang chờ!");
            const targetPages = await browser.pages();
            viewcratePage = targetPages[targetPages.length - 1]; // Fallback lấy tab cuối
        }

        viewcrateUrl = viewcratePage.url();
        console.log(`✅ [4] Trang đích vòng Bypass: ${viewcrateUrl}`);

        // ---- BƯỚC 3: CLICK N LOAD VIEWCRATE ----
        console.log(`⏳ Chờ 8 giây cho ViewCrate/Filecrypt load xong toàn bộ giao diện và Iframe...`);
        await new Promise(r => setTimeout(r, 8000));
        
        // Càn quét và tiêu diệt các lớp Overlay quảng cáo vô hình (đặc sản của Filecrypt)
        try {
            await viewcratePage.evaluate(() => {
                const overlays = Array.from(document.querySelectorAll('div, span, a, iframe'));
                for (const el of overlays) {
                    const style = window.getComputedStyle(el);
                    if (style.position === 'absolute' || style.position === 'fixed') {
                        if (parseInt(style.zIndex, 10) > 900 || style.opacity === '0' || style.width === '100%') {
                            if (!el.className.includes('recaptcha') && !el.className.includes('turnstile')) {
                                el.remove();
                            }
                        }
                    }
                }
            });
            console.log("🧹 Đã dọn dẹp các lớp quảng cáo tàng hình!");
        } catch(e) {}

        await viewcratePage.evaluate(() => window.scrollBy(0, 300)); // Cuộn xuống xíu cho chắc
        await new Promise(r => setTimeout(r, 2000));

        let clickedCnl = false;
        // Duyệt qua TẤT CẢ các Iframe đang có trên ViewCrate (Vì web hay giấu nút trong Iframe)
        for (const frame of viewcratePage.frames()) {
            try {
                const foundAndClicked = await frame.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    for (let el of elements) {
                        const text = (el.innerText || el.value || el.alt || '').toLowerCase();
                        const cls = (typeof el.className === 'string' ? el.className.toLowerCase() : '');
                        const id = (el.id || '').toLowerCase();
                        const src = (el.src || '').toLowerCase();
                        const onclick = (el.getAttribute('onclick') || '').toLowerCase();
                        
                        if (text.includes("click'n'load") || text.includes("click 'n' load") || text.includes("click'n load") || 
                            text.includes("dlbutton") || cls.includes('cnl') || cls.includes('dlbutton') || 
                            id.includes('cnl') || onclick.includes('crypted') || 
                            (el.tagName === 'IMG' && src.includes('cnl')) || (el.tagName === 'BUTTON' && text.includes('load'))) {
                            if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                                el.scrollIntoView({ behavior: 'center' });
                                el.click();
                                return true;
                            }
                        }
                    }
                    return false;
                });
                if (foundAndClicked) {
                    clickedCnl = true;
                    console.log("Tìm thấy nút trong frame:", frame.url());
                    break;
                }
            } catch(e) {}
        }

        if (clickedCnl) {
            console.log("🖱 Đã xác định vị trí và bấm vào nút Click'n'Load! (lần 1, xử lý quảng cáo nếu có)");
            // Một số site yêu cầu bấm lần 2 để hiện dialog cho phép; thử bấm lại sau 800ms
            await new Promise(r => setTimeout(r, 800));
            try {
                // Thử bấm thêm lần nữa trên tất cả các frame để kích hoạt dialog/bridge
                for (const frame of viewcratePage.frames()) {
                    try {
                        await frame.evaluate(() => {
                            const elements = Array.from(document.querySelectorAll('*'));
                            for (let el of elements) {
                                const text = (el.innerText || el.value || el.alt || '').toLowerCase();
                                const cls = (typeof el.className === 'string' ? el.className.toLowerCase() : '');
                                const id = (el.id || '').toLowerCase();
                                const src = (el.src || '').toLowerCase();
                                const onclick = (el.getAttribute('onclick') || '').toLowerCase();
                                
                                if (text.includes("click'n'load") || text.includes("click 'n' load") || text.includes("click'n load") || 
                                    text.includes("dlbutton") || cls.includes('cnl') || cls.includes('dlbutton') || 
                                    id.includes('cnl') || onclick.includes('crypted') || 
                                    (el.tagName === 'IMG' && src.includes('cnl')) || (el.tagName === 'BUTTON' && text.includes('load'))) {
                                    if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                                        el.scrollIntoView({ behavior: 'center' });
                                        el.click();
                                    }
                                }
                            }
                        }).catch(()=>{});
                    } catch(e) {}
                }

                // Sau khi click, scan các trang đang mở xem có popup bridge nào cần bấm Allow
                const pagesNow = await browser.pages();
                for (const p of pagesNow) {
                    try {
                        const u = p.url();
                        if (u && u.includes('viewcrate') && u.includes('cnl_bridge')) {
                            await p.bringToFront();
                            await p.waitForTimeout(300);
                            await p.evaluate(() => {
                                const btns = Array.from(document.querySelectorAll('button'));
                                for (const b of btns) {
                                    if ((b.innerText||'').toLowerCase().includes('allow') || (b.innerText||'').toLowerCase().includes('cho phép')) {
                                        b.click();
                                    }
                                }
                            }).catch(()=>{});
                        }
                    } catch(e) {}
                }

                console.log('🖱 Đã bấm lại Click\'n\'Load và cố gắng auto-Allow nếu popup xuất hiện. Chờ dữ liệu trả về cho server Node...');
            } catch(e) {
                // ignore
            }
        } else {
            console.log("⚠️ KHÔNG TÌM THẤY NÚT CLICK N LOAD tự động! Bạn vui lòng TỰ TAY BẤM NÚT ĐÓ TRÊN TRÌNH DUYỆT để tiếp tục nhé!");
        }

        // Chờ Data từ Web (tăng timeout lên 180s vì đôi khi ViewCrate trả chậm)
        // Chờ Data từ Web (tăng timeout lên 180s vì đôi khi ViewCrate trả chậm)
        extractedLinks = await Promise.race([
            cnlLinksPromise,
            new Promise(r => setTimeout(() => r("TIMEOUT"), 180000))
        ]);

        // Nếu fake JDownloader không trả lời, thử fallback đọc thẳng từ DOM (gọi khi CNL không gửi về)
        if (extractedLinks === "TIMEOUT" || !Array.isArray(extractedLinks) || extractedLinks.length === 0) {
            console.log("⚠️ Fake JDownloader không trả lời trong thời hạn. Thử fallback lấy trực tiếp mã hóa từ DOM...");
            
            // 1. Thử lấy crypted & jk từ DOM
            let cnlData = null;
            for (const frame of viewcratePage.frames()) {
                try {
                    const data = await frame.evaluate(() => {
                        const cryptedEl = document.querySelector('[name="crypted"]');
                        const jkEl = document.querySelector('[name="jk"]');
                        if (cryptedEl && jkEl && cryptedEl.value && jkEl.value) {
                            return { crypted: cryptedEl.value, jk: jkEl.value };
                        }
                        return null;
                    });
                    if (data) { cnlData = data; break; }
                } catch(e) {}
            }

            if (cnlData) {
                console.log("🔓 [FALLBACK] Đã tìm thấy mã Crypted và JK trong DOM! Đang tự giải mã...");
                try {
                    const crypto = require('crypto');
                    const keyStr = eval(`(${cnlData.jk})()`);
                    const key = Buffer.from(keyStr, 'hex');

                    const cryptedBuffer = Buffer.from(cnlData.crypted, 'base64');
                    const decipher = crypto.createDecipheriv('aes-128-cbc', key, key);
                    decipher.setAutoPadding(false); 
                    
                    let decrypted = decipher.update(cryptedBuffer, undefined, 'utf8');
                    decrypted += decipher.final('utf8');

                    const links = decrypted.replace(/\x00/g, '').split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
                    if (links.length > 0) {
                        extractedLinks = links;
                        console.log(`✅ [FALLBACK] Tự giải mã thành công ${links.length} link Click'n'Load từ DOM!`);
                    }
                } catch(err) {
                    console.log("⚠️ [FALLBACK] Tự giải mã thất bại:", err.message);
                }
            }

            // 2. Nếu vẫn thất bại, tìm link trần trụi trên HTML
            if (!Array.isArray(extractedLinks) || extractedLinks.length === 0) {
                try {
                    const fallback = await viewcratePage.evaluate(() => {
                        const html = document.body.innerHTML;
                        const urls = html.match(/https?:\/\/(?:www\.)?(?:gofile\.io\/d\/[A-Za-z0-9]+|pixeldrain\.com\/u\/[A-Za-z0-9]+|send\.now\/[A-Za-z0-9]+|send\.cm\/[A-Za-z0-9]+)/g);
                        return urls || [];
                    });
                    if (fallback && fallback.length > 0) {
                        extractedLinks = fallback;
                        console.log(`🔎 Fallback tìm được ${extractedLinks.length} link từ DOM.`);
                    }
                } catch (e) {
                    console.log('⚠️ Fallback DOM extraction thất bại:', e.message);
                }
            }
        }
        
        } // End of else (!isDirectLinkMatch)

        if (!Array.isArray(extractedLinks) || extractedLinks.length === 0) {
            throw new Error("❌ Đã quá hạn hoặc không lấy được link Click'n'Load. Hủy bỏ quy trình!");
        }

        console.log(`✅ [5] CÁC LINK GỐC ĐÃ EXTRACT:`, extractedLinks);

        if (jobData && jobData.extractOnly) {
            console.log("✅ [Extract Only Mode] Trả về danh sách link và kết thúc.");
            if (browser) await browser.close();
            if (server) server.close();
            return extractedLinks;
        }

        // Helper: try parse series/season/episode from filename
        function parseSeriesSeasonEpisode(name) {
            try {
                const m = name.match(/(.+?)\.s(\d{2})e(\d{2})/i) || name.match(/(.+?) - s(\d{2})e(\d{2})/i);
                if (m) {
                    let seriesRaw = m[1];
                    seriesRaw = seriesRaw.replace(/\.|_/g, ' ').trim();
                    const season = `S${m[2]}`;
                    const episode = `E${m[3]}`;
                    return { series: seriesRaw, season, episode };
                }
                const m2 = name.match(/s?(\d{1,2})e(\d{2})/i);
                if (m2) {
                    return { series: null, season: `S${m2[1].padStart(2,'0')}`, episode: `E${m2[2]}` };
                }
            } catch(e) {}
            return { series: null, season: null, episode: null };
        }

        const preferredMovieTitle = sanitizeName(targetMovie?.origin_name || targetMovie?.name || '');
        let inferredSeasonName = 'S01';
        if (targetMovie) {
            const mSeason = (preferredMovieTitle || '').match(/season\s*(\d+)/i);
            if (mSeason) inferredSeasonName = `S${String(mSeason[1]).padStart(2, '0')}`;
        }

        const processedEpisodes = new Set();

        for (const src of extractedLinks) {
            let directLinkToUpload = null;
            let finalFilename = "PhimMoi.mp4";
            
            try {
                if (src.includes('gofile.io')) {
                    const gofileIdMatch = src.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
                    if (gofileIdMatch) {
                        const files = await gofileService.getMkvFilesFromFolder(gofileIdMatch[1]);
                        if (files && files.length > 0 && files[0].link && !files[0].link.startsWith('javascript')) {
                            directLinkToUpload = files[0].link;
                            finalFilename = files[0].name || finalFilename;
                        }
                    }
                } else if (src.includes('pixeldrain.com')) {
                    const idMatch = src.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                    if (idMatch) {
                        const id = idMatch[1];
                        try {
                            await new Promise(r => setTimeout(r, 1500)); // Delay để tránh Rate Limit của Pixeldrain
                            const res = await axios.get(`https://pixeldrain.com/api/file/${id}/info`);
                            if (res.data && res.data.name) {
                                finalFilename = res.data.name;
                                directLinkToUpload = `https://pixeldrain.com/api/file/${id}`;
                            }
                        } catch(e) {
                            console.log(`⚠️ Lỗi lấy thông tin file Pixeldrain ${id}:`, e.message);
                        }
                    }
                }
            } catch (e) {}

            if (!directLinkToUpload) continue;

            const parsed = parseSeriesSeasonEpisode(finalFilename);
            if (!parsed.episode) continue;
            
            // Lọc đúng tập cần upload nếu có truyền targetEpisode (cho tính năng Retry)
            if (targetEpisode && parsed.episode !== targetEpisode) {
                continue;
            }

            if (processedEpisodes.has(parsed.episode)) {
                continue;
            }

            console.log(`\n==========================================`);
            console.log(`🚀 [6] ĐẨY TẬP ${parsed.episode} LÊN MÁY CHỦ BẰNG REMOTE UPLOAD`);
            console.log(`- Tên file: ${finalFilename}`);
            console.log(`- Liên kết: ${directLinkToUpload}`);

            const seriesName = sanitizeName(preferredMovieTitle || parsed.series || null);
            const seasonName = parsed.season || inferredSeasonName || 'S01';
            const episodeName = parsed.episode;
            
            let tmdbMatch = null;
            if (seriesName && !processedEpisodes.size) { // Only search TMDB on first episode
                try {
                    tmdbMatch = await tmdbService.searchSeries(seriesName);
                    if (tmdbMatch) console.log(`[TMDB] Matched series ${tmdbMatch.name} (id=${tmdbMatch.tmdbId}) score=${tmdbMatch.score}`);
                } catch(e) {}
            }

            const priorityHosts = ['Play4Me']; // Đã ẩn Abyss theo yêu cầu của User
            let uploadSuccessCount = 0;

            for (const hostKey of priorityHosts) {
                console.log(`\n▶️ Checking/Uploading to Host: ${hostKey}...`);
                if (!forceUpload) {
                    const duplicate = await hostManager.checkDuplicate(seriesName, seasonName, episodeName, hostKey, directLinkToUpload);
                    if (duplicate) {
                        console.log(`✅ [${hostKey}] Đã tồn tại bản upload trước đó (ID: ${duplicate._id}). Bỏ qua upload để tránh trùng lặp!`);
                        uploadSuccessCount += 1;
                        continue;
                    }
                }

                if (hostKey === 'Abyss') {
                    // Push to Background Queue
                    const folderName = seriesName ? `${seriesName} - ${seasonName}` : 'PhimMoi';
                    console.log(`⏳ [Abyss] Đẩy file vào hàng đợi ngầm (Background Queue) để tránh treo hệ thống...`);
                    abyssUploadQueue.push({ 
                        hostKey, directLinkToUpload, finalFilename, folderId: null, folderName,
                        seriesName, seasonName, episodeName, tmdbId: tmdbMatch?.tmdbId || null, 
                        localMovieId, viewcrateUrl 
                    });
                    processAbyssQueue().catch(()=>{});
                    uploadSuccessCount += 1;
                    continue; // Chuyển sang tập tiếp theo ngay lập tức!
                }

                try {
                    // Play4Me Logic (Fast URL Remote Upload)
                    const folderName = seriesName ? `${seriesName} - ${seasonName}` : 'PhimMoi';
                    const folderId = await hostManager.createOrGetFolder(seriesName, seasonName, hostKey, folderName);
                    
                    const res = await hostManager.remoteUploadWithRetry(hostKey, directLinkToUpload, finalFilename, folderId);
                    if (!res.ok) throw new Error(res.error || 'upload failed');
                    
                    const taskId = res.taskId;
                    console.log(`✅ [${hostKey}] Thành công! Task ID: ${taskId}`);
                    
                    const doc = await hostManager.recordUpload({ 
                        series: seriesName, season: seasonName, episode: episodeName, tmdbId: tmdbMatch?.tmdbId || null, 
                        movieId: localMovieId,
                        sourcePage: viewcrateUrl, sourceDirectUrl: directLinkToUpload, filename: finalFilename, 
                        host: hostKey, taskId: taskId, status: 'pending', retries: res.attempts - 1 
                    });
                    
                    const apiToPoll = play4meAPI;
                    hostManager.pollAndSyncStatus(apiToPoll, taskId, doc._id).catch(()=>{});
                    uploadSuccessCount += 1;
                } catch (e) {
                    console.log(`❌ [${hostKey}] Thất bại upload: ${e.message}`);
                    await hostManager.recordUpload({ 
                        series: seriesName, season: seasonName, episode: episodeName, sourcePage: viewcrateUrl, 
                        sourceDirectUrl: directLinkToUpload, filename: finalFilename, host: hostKey, taskId: null, status: 'failed', notes: e.message 
                    });
                }
            }
            
            if (uploadSuccessCount > 0) {
                processedEpisodes.add(parsed.episode);
            }
        } // End episodes loop
        
        console.log(`\n🎉 HOÀN TẤT TOÀN BỘ QUY TRÌNH! Đã xử lý thành công ${processedEpisodes.size} tập phim.`);
        
    } catch (error) {
        console.error("\n❌ LỖI NGHIÊM TRỌNG TRONG PIPELINE:", error.message);
        try {
            await require('./utils/hostManager').recordUpload({
                series: jobData?.showName || jobData?.seriesName || 'Auto Pipeline',
                season: jobData?.seasonName || 'Unknown',
                episode: jobData?.episodeName || 'Lỗi bóc tách link',
                sourcePage: jobData?.sourceUrl || 'Unknown',
                status: 'failed',
                host: 'System',
                notes: error.message
            });
        } catch(e) { console.error("Lỗi khi lưu log failed:", e.message); }
    } finally {
        if(browser) await browser.close();
        if(server) server.close();
        if (require.main === module) {
            process.exit(0);
        }
    }
}

// Export for programmatic usage from batch runners
module.exports = { runAutoUploadPipeline };

// When run directly, use CLI URL if provided
if (require.main === module) {
    const cliUrl = process.argv[2];
    if (!cliUrl) {
        console.error('Usage: node server/auto_pipeline.js <movie_page_url>');
        process.exit(2);
    }
    const forceUpload = process.argv.includes('--force');
    runAutoUploadPipeline({ sourceUrl: cliUrl, forceUpload });
}