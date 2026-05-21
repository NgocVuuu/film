require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { PremiumHostService } = require('./utils/videoHostProviders');
const gofileService = require('./utils/gofileService');

const play4me = new PremiumHostService('Play4Me', 'https://player4me.com', process.env.PLAY4ME_API_KEY);
const seekStreaming = new PremiumHostService('SeekStreaming', 'https://seekstreaming.com', process.env.SEEKSTREAMING_API_KEY);

async function runTest() {
    const viewcrateUrl = 'https://viewcrate.cc/c/3dfd78bec60c2ba6efc68e0dc9c14bed';
    
    let browser;
    try {
        console.log("🚀 Mở trình duyệt ẩn danh vào Viewcrate và lắng nghe Network API...");
        browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        // Mảng chứa các link tìm được
        let foundLinks = [];

        // Lắng nghe network responses để bắt link ngầm
        page.on('response', async (response) => {
            try {
                if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
                    const text = await response.text();
                    if (text.includes('gofile.io')) {
                        // Extract URL using regex
                        const urls = text.match(/https?:\/\/(?:www\.)?gofile\.io\/d\/[a-zA-Z0-9]+/g);
                        if (urls) foundLinks.push(...urls);
                    }
                }
            } catch (e) {}
        });

        await page.goto(viewcrateUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("👉 Đã load xong ViewCrate.");

        // Nếu chưa tìm thấy qua network, thử quét trong HTML DOM (Obfuscated)
        if (foundLinks.length === 0) {
            const htmlUrls = await page.evaluate(() => {
                const text = document.body.innerHTML;
                const urls = text.match(/https?:\/\/(?:www\.)?gofile\.io\/d\/[a-zA-Z0-9]+/g);
                return urls || [];
            });
            foundLinks.push(...htmlUrls);
        }

        // Lọc trùng
        foundLinks = [...new Set(foundLinks)];
        
        console.log("🔗 Các Gofile ID tìm thấy:", foundLinks);

        if (foundLinks.length === 0) {
            console.log("⚠️ Không bóc được link Gofile. Sẽ lấy 1 link video Test (Big Buck Bunny) để test API...");
        }

        // Lấy link đầu tiên làm mồi
        let directLink = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        let filename = 'BigBuckBunny_Test.mp4';

        if (foundLinks.length > 0) {
            const gofileUrl = foundLinks[0];
            const gofileIdMatch = gofileUrl.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
            if (gofileIdMatch) {
                console.log(`🔍 Đang dùng Gofile API để lấy direct link của ID: ${gofileIdMatch[1]}`);
                const files = await gofileService.getMkvFilesFromFolder(gofileIdMatch[1]);
                if (files && files.length > 0) {
                    directLink = files[0].link; 
                    filename = files[0].name;
                    console.log(`🎯 Cáo được Direct Link thực tế: ${directLink}`);
                }
            }
        }

        console.log("==========================================");
        console.log(`⏳ Bắn lệnh Remote Upload lên 2 server host...`);
        console.log(`- File Name: ${filename}`);
        console.log(`- Link: ${directLink}`);
        
        try {
            const play4meId = await play4me.remoteUpload(directLink, filename);
            console.log(`✅ ［Play4Me］ Upload Task ID: ${play4meId}`);
        } catch(e) { 
            console.log(`❌ ［Play4Me］ Thất bại:`, e.message);
        }

        try {
            const seekId = await seekStreaming.remoteUpload(directLink, filename);
            console.log(`✅ ［SeekStreaming］ Upload Task ID: ${seekId}`);
        } catch(e) { 
            console.log(`❌ ［SeekStreaming］ Thất bại:`, e.message);
        }
        
    } catch(err) {
        console.error(err);
    } finally {
        if(browser) await browser.close();
    }
}
runTest();