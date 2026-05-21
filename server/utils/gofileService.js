const axios = require('axios');
const puppeteer = require('puppeteer-extra');

class GofileService {
    constructor() {
        this.baseUrl = 'https://api.gofile.io';
        this.token = process.env.GOFILE_API_TOKEN || ''; 
    }

    async ensureToken() {
        if (!this.token) {
            try {
                const res = await axios.post(`${this.baseUrl}/accounts`);
                if (res.data && res.data.status === 'ok') {
                    this.token = res.data.data.token;
                    console.log(`[Gofile] Đã tạo Guest Token: ${this.token}`);
                }
            } catch(e) {
                console.error('[Gofile] Lỗi khi tạo token', e.message);
            }
        }
    }

    async getMkvFilesFromFolder(folderId) {
        try {
            await this.ensureToken();
            console.log(`[Gofile] Đang bóc danh sách file từ thư mục API: ${folderId}`);
            
            const headers = this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
            
            const response = await axios.get(`${this.baseUrl}/contents/${folderId}`, { headers });
            
            if (response.data.status !== 'ok') {
                throw new Error('Lỗi từ Gofile API: ' + response.data.status);
            }

            const children = response.data.data.children || {};
            const mkvFiles = [];

            for (const key in children) {
                const child = children[key];
                if (child.type === 'file' && (child.name.endsWith('.mkv') || child.name.endsWith('.mp4'))) {
                    mkvFiles.push({
                        id: child.id,
                        name: child.name,
                        link: child.link || null 
                    });
                }
            }

            mkvFiles.sort((a, b) => a.name.localeCompare(b.name));

            console.log(`[Gofile] API Tìm thấy ${mkvFiles.length} file video.`);
            
            if (mkvFiles.length > 0) return mkvFiles;

        } catch (error) {
            console.error('[Gofile] Lỗi khi lấy API Gofile:', error.response ? error.response.data : error.message);
        }
        
        console.log('[Gofile] Fallback sang Puppeteer cạo trực tiếp trang gofile...');
        return this.scrapeGofileWebsite(`https://gofile.io/d/${folderId}`);
    }

    async scrapeGofileWebsite(gofileUrl) {
         let browser = null;
         try {
             browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            console.log(`[Gofile Scraper] Truy cập: ${gofileUrl}`);
            await page.goto(gofileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            await page.waitForSelector('.files, .list-group, #filesContent', { timeout: 15000 }).catch(() => {});
            
            await new Promise(r => setTimeout(r, 4000));
            // Tìm các phần tử file; nhiều liên kết là javascript:void(0) nên cần click vào từng file
            // Lấy tất cả anchor và lọc những anchor có vẻ là file (tên chứa .mkv/.mp4 hoặc href có chỉ dấu file)
            const allAnchors = await page.$$('a');
            const fileHandles = [];
            for (const a of allAnchors) {
                try {
                    const text = (await page.evaluate(el => el.innerText || '', a)).toLowerCase();
                    const href = (await page.evaluate(el => el.getAttribute('href') || '', a)) || '';
                    if (text.includes('.mkv') || text.includes('.mp4') || href.includes('/file') || href.includes('/f/') || href.includes('/d/')) {
                        fileHandles.push(a);
                    }
                } catch(e) {}
            }
            const results = [];

            // Lắng nghe response mạng để bắt URL CDN thực sự (srv-file hoặc response có content-disposition attachment)
            const captured = new Set();
            page.on('response', async (resp) => {
                try {
                    const u = resp.url();
                    const h = resp.headers();
                    const ct = (h['content-type'] || '').toLowerCase();
                    const cd = (h['content-disposition'] || '').toLowerCase();
                    if (u.includes('srv-file') || u.includes('gofile.io/download') || ct.startsWith('video') || ct.includes('application/octet-stream') || cd.includes('attachment')) {
                        captured.add(u);
                    }
                } catch(e) {}
            });

            for (let i = 0; i < fileHandles.length; i++) {
                try {
                    const handle = fileHandles[i];
                    const name = await page.evaluate(el => el.innerText.trim(), handle).catch(() => 'video');
                    // Click to open file details / modal
                    await handle.click().catch(() => {});

                    // Chờ response mạng được capture (trong 4s) - ưu tiên URL CDN
                    try {
                        const resp = await page.waitForResponse(r => {
                            const u = r.url();
                            const h = r.headers();
                            const ct = (h['content-type'] || '').toLowerCase();
                            const cd = (h['content-disposition'] || '').toLowerCase();
                            return u.includes('srv-file') || u.includes('gofile.io/download') || ct.startsWith('video') || ct.includes('application/octet-stream') || cd.includes('attachment');
                        }, { timeout: 4000 });

                        const url = resp.url();
                        results.push({ name: name || `video${i}`, link: url });
                    } catch (e) {
                        // Không có response phù hợp trong thời hạn, fallback sang DOM scan
                        await new Promise(r => setTimeout(r, 1200));
                        const direct = await page.evaluate(() => {
                            const anchors = Array.from(document.querySelectorAll('a'));
                            for (const a of anchors) {
                                const href = a.getAttribute('href') || '';
                                if (href.startsWith('https://srv-file') || href.includes('gofile.io/download') || href.includes('pixeldrain.com') || href.includes('send.now')) return href;
                            }
                            return null;
                        });
                        results.push({ name: name || `video${i}`, link: direct || 'javascript:void(0)' });
                    }

                    // Nếu modal opened, try to close it (press Escape)
                    await page.keyboard.press('Escape').catch(() => {});
                    await new Promise(r => setTimeout(r, 300));
                } catch(e) {
                    // swallow
                }
            }

            console.log(`[Gofile Scraper] TÌm thấy ${results.length} file.`);
            return results;
         } catch(e) {
             console.log('[Gofile Scraper] Lỗi cạo:', e.message);
             return [];
         } finally {
             if (browser) await browser.close();
         }
    }
}

module.exports = new GofileService();