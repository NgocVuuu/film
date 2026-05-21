const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json());

// Fake các route mà website dùng để kiểm tra xem máy mình có cài Jdownloader hay không
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    next();
});

app.get('/jdcheck.js', (req, res) => {
    // Trả về tín hiệu "Tôi là Jdownloader đây"
    res.send("jdownloader=true; var version='16282';");
});

app.get('/flash/', (req, res) => {
    res.send("JDownloader");
});

// Promise hứng Link
let resolveLinks;
const linksPromise = new Promise(r => resolveLinks = r);

// Route thực sự để hứng cục rác mã hóa từ web ném sang
app.post('/flash/addcrypted2', (req, res) => {
    console.log("\n📥 [FAKE-JD] Đã bắt được dữ liệu Click'n'Load từ ViewCrate!");
    const crypted = req.body.crypted;
    const jk = req.body.jk; 

    try {
        // Tách khóa bảo mật (Hàm JS mà ViewCrate tạo ra)
        console.log("🔑 [FAKE-JD] Đang phá khóa bằng hàm:", jk.substring(0, 30) + '...');
        const keyStr = eval(`(${jk})()`); 
        const key = Buffer.from(keyStr, 'hex');

        // CNL2 dùng AES-128-CBC với IV chính là Key
        const cryptedBuffer = Buffer.from(crypted, 'base64');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, key);
        decipher.setAutoPadding(false); // <--- QUAN TRỌNG: CNL2 thường không chuẩn PKCS7
        
        let decrypted = decipher.update(cryptedBuffer, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        // Bỏ hết ký tự rác (padding text / null text), lọc lấy link
        const links = decrypted.replace(/\x00/g, '').split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
        
        console.log(`🔓 [FAKE-JD] GIẢI MÃ THÀNH CÔNG ${links.length} LINKS!`);
        resolveLinks(links);
    } catch(e) {
        console.error("❌ Lỗi giải mã:", e.message);
        resolveLinks(["Error Decoding", req.body]); 
    }

    res.send("success");
});

// Chạy Port giả mạo
const server = app.listen(9666, async () => {
    console.log("🚀 Server JDownloader Fake đang chạy ở cổng 9666...");
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        console.log("🌍 Chạy bot truy cập ViewCrate...");
        await page.goto('https://viewcrate.cc/c/3dfd78bec60c2ba6efc68e0dc9c14bed', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Đợi trang bung JS và tìm nút Click'n'Load...");
        await new Promise(r => setTimeout(r, 6000));
        
        const clicked = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            for (let el of elements) {
                // ViewCrate thường để text nút chữ Click'n'Load hoặc icon Cloud
                if (el.innerText && el.innerText.includes("Click'n'Load")) {
                    el.click();
                    return true;
                }
            }
            return false;
        });

        if (clicked) {
            console.log("🖱 Đã giả lập lệnh bấm chuột vào nút Click'n'Load! Chờ web gửi Data bí mật...");
        } else {
            console.log("⚠️ Bot không tìm thấy nút. TRÊN TRÌNH DUYỆT ĐANG MỞ, BẠN HÃY CLICK TAY VÀO NÚT CLICK'N'LOAD ĐỂ TEST NHÉ!");
        }

        // Chờ Data từ Web
        const links = await Promise.race([
            linksPromise,
            new Promise(r => setTimeout(() => r("TIMEOUT"), 60000))
        ]);
        
        if (links === "TIMEOUT") {
            console.log("⏳ Hết 60s không nhận được tín hiệu.");
        } else {
            console.log("\n🎉 KẾT QUẢ CUỐI CÙNG (DÙNG ĐỂ NÉM VÀO REMOTE UPLOAD):");
            console.dir(links, { maxArrayLength: null });
        }
        
    } catch(e) {
        console.error(e);
    } finally {
        if(browser) await browser.close();
        server.close();
        process.exit(0);
    }
});