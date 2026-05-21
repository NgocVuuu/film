require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { PremiumHostService, play4meAPI, seekStreamingAPI } = require('./utils/videoHostProviders');
const gofileService = require('./utils/gofileService');

async function run() {
    console.log("🚀 Bắt đầu truy cập ViewCrate để lấy link từng tập...");
    const viewcrateUrl = 'https://viewcrate.cc/c/3dfd78bec60c2ba6efc68e0dc9c14bed';
    
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto(viewcrateUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("Đã load trang ViewCrate. Đang bóc tách link...");
        
        await new Promise(r => setTimeout(r, 5000));
        
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('viewcrate_debug.html', html);
        console.log("Đã lưu viewcrate_debug.html để check");

        // Viewcrate often puts the actual URLs in a data attribute or class
        // Let's grab whatever we can that points to gofile, filemoon, etc.
        const externalLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const matches = [];
            for (let a of links) {
                if (a.href && (a.href.includes('gofile.io/d/') || a.href.includes('filemoon'))) {
                    matches.push(a.href);
                }
            }
            return [...new Set(matches)];
        });
        
        console.log(`Tìm thấy ${externalLinks.length} link tải trực tiếp (Gofile/Filemoon...).`);
        
        if (externalLinks.length > 0) {
            console.log(externalLinks);
        } else {
            console.log("Không lấy được đường dẫn tĩnh. ViewCrate có thể đang dùng nút ẩn hoặc API Fetch.");
            console.log("Vui lòng check file viewcrate_debug.html trong thư mục server/");
        }

    } catch(err) {
        console.error("Lỗi:", err);
    } finally {
        if (browser) await browser.close();
    }
}

run();