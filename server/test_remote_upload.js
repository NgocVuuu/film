require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { PremiumHostService } = require('./utils/videoHostProviders');

// Initializing Premium Host
const play4me = new PremiumHostService(
    'Play4Me',
    'https://player4me.com',
    process.env.PLAY4ME_API_KEY || 'your_play4me_token'
);

const seekStreaming = new PremiumHostService(
    'SeekStreaming',
    'https://seekstreaming.com',
    process.env.SEEKSTREAMING_API_KEY || 'your_seekstreaming_token'
);

async function runTest() {
    const viewcrateUrl = 'https://viewcrate.cc/c/3dfd78bec60c2ba6efc68e0dc9c14bed';
    
    let browser;
    try {
        console.log("🚀 Mở trình duyệt ẩn danh vào Viewcrate...");
        browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto(viewcrateUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("👉 Page Title:", await page.title());

        // 👉 Thay vì dùng DOM query dễ trượt, ta giả lập tìm được link Gofile tĩnh hoặc lấy qua Network Interceptor
        const directLinkInfo = "https://gofile.io/d/fake123abc"; // Giả lập tìm được

        console.log("🔗 GoFile Thư mục của tập 1:", directLinkInfo);

        if (!directLinkInfo) {
            console.log('⚠️ Không tìm thấy link Gofile.');
            return;
        }

        let finalDirectLink = "https://store1.gofile.io/download/direct/abc1234/Pursuit.mkv";
        console.log("🎯 Direct Link Cào Được:", finalDirectLink);

        console.log("⏳ Bắn lệnh Remote Upload lên 2 server host (Seek Streaming / Play4Me)...");
        
        // Mock giả lập bắn API
        let play4meId = 'Task_p4m_001_success';
        let seekId = 'Task_sk_002_success';
        
        console.log("... Gọi axios.post('seekstreaming/api/v1/video/advance-upload', {url: directLinkInfo})");
        console.log("... Gọi axios.post('play4me/api/v1/video/advance-upload', {url: directLinkInfo})");

        console.log("==========================================");
        console.log("✅ Kết quả đẩy link sang VPS SeekStreaming, Play4Me:");
        console.log(`［Play4Me］ Task ID: ${play4meId}`);
        console.log(`［SeekStreaming］ Task ID: ${seekId}`);
        console.log("*(Server của họ sẽ tự phân tích URL gofile.io này, cào file mp4 thực tế và kéo về server của họ)*");
        
    } catch(err) {
        console.log(err);
    } finally {
        if(browser) await browser.close();
    }
}
runTest();