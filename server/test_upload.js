require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        console.log('--- BẮT ĐẦU QUY TRÌNH ---');
        const viewcrateUrl = 'https://viewcrate.cc/c/3dfd78bec60c2ba6efc68e0dc9c14bed';
        
        console.log('[Bước 1] Mở Viewcrate...');
        await page.goto(viewcrateUrl, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 5000));
        
        // Bắt mọi sự kiện mở tab mới hoặc chuyển hướng để lấy link Gofile
        const gofileLinks = [];
        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page();
                if (newPage) {
                    const url = newPage.url();
                    console.log('New tab opened:', url);
                    if (url.includes('gofile.io')) {
                        gofileLinks.push(url);
                        await newPage.close();
                    }
                }
            }
        });

        console.log('[Bước 2] Tìm và click tất cả các nút Gofile...');
        const gofileButtons = await page.$$('div[data-u81w0="gofile.io"] button');
        console.log(`Tìm thấy ${gofileButtons.length} tập trên Gofile.`);

        // Click thử tập 1
        if (gofileButtons.length > 0) {
            console.log('Click tập 1...');
            
            // Intercept requests
            await page.setRequestInterception(true);
            page.on('request', req => {
                if (req.url().includes('/resolve-link') || req.url().includes('/open')) {
                    console.log('API Request:', req.url(), req.postData());
                }
                req.continue();
            });
            page.on('response', async res => {
                if (res.url().includes('/resolve-link') || res.url().includes('/open')) {
                    console.log('API Response:', await res.text());
                }
            });

            await gofileButtons[0].click();
            await new Promise(r => setTimeout(r, 10000)); // Đợi popup/redirect
        }
        
    } catch (error) {
        console.error('Lỗi quy trình:', error.message);
    } finally {
        await browser.close();
        process.exit(0);
    }
}

run();
