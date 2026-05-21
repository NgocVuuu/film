const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class MkvScraper {
    constructor() {
        this.browser = null;
    }

    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: false, // Chạy có UI để vượt Cloudflare dễ hơn và người dùng có thể can thiệp
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security'
                ]
            });
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async simulateHumanMouse(page) {
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * 800) + 100;
            const y = Math.floor(Math.random() * 600) + 100;
            await page.mouse.move(x, y);
            await new Promise(r => setTimeout(r, Math.random() * 500));
        }
    }

    /**
     * Truy cập linh phim, refresh để reset thời gian chờ, lấy link ouo của link 1 - 2160
     */
    async getOuoLinkFromMoviePage(movieUrl) {
        if (!this.browser) await this.initBrowser();
        const page = await this.browser.newPage();
        
        try {
            console.log(`[MkvScraper] Truy cập link phim: ${movieUrl}`);
            await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log(`[MkvScraper] Chờ xem có Cloudflare không...`);
            await new Promise(r => setTimeout(r, 4000));

            for(let i=0; i<5; i++) {
                const isCf = await page.evaluate(() => document.title.includes('moment') || document.body.innerText.includes('Cloudflare'));
                if (isCf) {
                    console.log(`[MkvScraper] Phát hiện Cloudflare, đang chờ... (${i+1}/5)`);
                    
                    // Thử click vào một điểm giữa màn hình (nơi Cloudflare có thể hiển thị checkbox Turnstile)
                    const x = 800 / 2;
                    const y = 600 / 2;
                    await page.mouse.click(x, y);

                    await new Promise(r => setTimeout(r, 6000));
                } else {
                    break;
                }
            }
            
            console.log(`[MkvScraper] Refresh lại trang để hiện link (bypass bộ đếm thời gian)...`);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log(`[MkvScraper] Chờ 5s cho trang load xong...`);
            await new Promise(r => setTimeout(r, 5000));
            await this.simulateHumanMouse(page);

            console.log(`[MkvScraper] Kéo xuống...`);
            await page.evaluate(() => {
                window.scrollBy(0, document.body.scrollHeight / 2);
            });
            await new Promise(r => setTimeout(r, 1000));

            const ouoLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const ouoLinks = links.filter(a => a.href.includes('ouo.io') || a.href.includes('ouo.press'));
                
                // Tìm mục chứa 1080 hoặc 720 (ưu tiên 1080)
                for (let a of ouoLinks) {
                    const rowText = a.closest('tr')?.innerText.toLowerCase() || a.closest('.row')?.innerText.toLowerCase() || '';
                    if ((rowText.includes('1080') || rowText.includes('720')) && a.innerText.toLowerCase().includes('link 1')) {
                        return a.href; 
                    }
                }
                
                // Thuật toán dự phòng
                for (let a of ouoLinks) {
                    const parentText = (a.parentElement?.parentElement?.innerText || a.parentElement?.innerText || '').toLowerCase();
                    const grandText = a.closest('tr')?.innerText.toLowerCase() || '';
                    if (parentText.includes('1080') || grandText.includes('1080p') || parentText.includes('720') || grandText.includes('720p')) {
                        return a.href;
                    }
                }

                return ouoLinks.length > 0 ? ouoLinks[0].href : null;
            });

            if (!ouoLink) {
                // Hãy thử in ra toàn bộ text để debug
                const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
                console.log(`[MkvScraper] Không tìm thấy link ouo.io nào. Nội dung web: ${pageText}`);
                throw new Error("Không thể tìm thấy link ouo.io nào cho định dạng 1080/720 trong trang này.");
            }

            console.log(`[MkvScraper] Đã bóc được link ouo: ${ouoLink}`);
            return ouoLink;

        } finally {
            await page.close();
        }
    }

    async bypassOuoAndGetGofile(ouoUrl) {
        if (!this.browser) await this.initBrowser();
        const page = await this.browser.newPage();
        
        try {
            console.log(`[MkvScraper] Bypass ouo cho: ${ouoUrl}`);
            await page.goto(ouoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await this.simulateHumanMouse(page);

            const humanBtnSelector = '#btn-main, .btn-main';
            try {
                await page.waitForSelector(humanBtnSelector, { timeout: 10000 });
                console.log('[MkvScraper] Found Human button. Simulating click...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
                    page.click(humanBtnSelector)
                ]);
            } catch (e) {
                const hasRecaptcha = await page.$('.g-recaptcha, iframe[src*="recaptcha"]');
                if (hasRecaptcha) {
                    throw new Error('Blocked by Recaptcha! IP might be flagged.');
                }
            }

            console.log('[MkvScraper] Waiting 6 seconds (ouo timer)...');
            await new Promise(r => setTimeout(r, 6000));
            await this.simulateHumanMouse(page);
            
            try {
                await page.waitForSelector(humanBtnSelector, { timeout: 10000 });
                console.log('[MkvScraper] Clicking Get Link...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    page.click(humanBtnSelector)
                ]);
            } catch (e) {
                console.log('[MkvScraper] Could not find Get Link button or timed out.');
            }
            
            let finalUrl = page.url();
            console.log(`[MkvScraper] Reached URL: ${finalUrl}`);
            
            if (finalUrl.includes('gofile.io')) return finalUrl;

            const gofileLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                for (let a of links) {
                    if (a.href && a.href.includes('gofile.io')) return a.href;
                }
                return null;
            });
            
            if (gofileLink) return gofileLink;
            throw new Error(`Failed to extract gofile via ${finalUrl}`);

        } finally {
            await page.close();
        }
    }
}

module.exports = MkvScraper;
