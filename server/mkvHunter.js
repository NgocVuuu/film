require('dotenv').config();
const tmdbDiscovery = require('./utils/tmdbDiscovery');
const MkvScraper = require('./utils/mkvScraper');
const gofileService = require('./utils/gofileService');
const { PremiumHostService } = require('./utils/videoHostProviders');

// Initialize Premium Hosts
// Make sure to set these in your .env or replace them with actual tokens
const play4me = new PremiumHostService(
    'Play4Me',
    'https://player4me.com',
    process.env.PLAY4ME_API_KEY || 'your_play4me_token'
);

const abyssService = require('./utils/videoHostProviders').abyssAPI;

// --- BACKGROUND QUEUE FOR ABYSS ---
const abyssUploadQueue = [];
let isAbyssUploading = false;

async function processAbyssQueue() {
    if (isAbyssUploading) return;
    isAbyssUploading = true;
    while(abyssUploadQueue.length > 0) {
        const job = abyssUploadQueue.shift();
        try {
            console.log(`\n[Abyss Queue] Đang tải lên: ${job.title}... (Còn ${abyssUploadQueue.length} tập)`);
            const abyssSlug = await abyssService.remoteUpload(job.mkvUrl, job.title);
            console.log(`  ✅ [Abyss Queue] Upload thành công! Slug: ${abyssSlug}`);
        } catch (e) {
            console.error(`  ❌ [Abyss Queue] Lỗi Upload ${job.title}:`, e.message);
        }
    }
    isAbyssUploading = false;
    console.log(`\n🎉 [Abyss Queue] Đã hoàn thành toàn bộ hàng đợi Abyss!`);
}

class MkvHunter {
    constructor() {
        this.scraper = new MkvScraper();
    }

    /**
     * Start the automated hunting process
     */
    async startHunting() {
        console.log("=========================================");
        console.log("🚀 Bắt đầu tiến trình săn MKV tự động...");
        console.log("=========================================\n");

        try {
            const targetMoviePageUrl = 'https://mkvdrama.net/760409-pursuit-of-jade';
            const targetMovieTitle = 'Pursuit of Jade (2026)';
            
            console.log(`🎬 Phim Target Hardcoded: ${targetMovieTitle}`);
            console.log(`\n[Bước 2] Bắt đầu gọi Bot giả lập để càn quét link phim: ${targetMoviePageUrl}...`);

            await this.scraper.initBrowser();
            let gofileUrl;
            try {
                // Tích hợp logic tìm kiếm ouo link tại web trực tiếp
                const actualOuoUrl = await this.scraper.getOuoLinkFromMoviePage(targetMoviePageUrl);

                // Sau khi có ouoLink, tiến hành bypass
                gofileUrl = await this.scraper.bypassOuoAndGetGofile(actualOuoUrl);
                console.log(`✅ Bypass thành công! Link Gofile: ${gofileUrl}`);
            } catch (bypassErr) {
                console.error(`❌ Bypass ouo thất bại: ${bypassErr.message}`);
                console.log("⚠️ Chuyển qua lấy link test mẫu để test tiếp các bước sau...");
                gofileUrl = 'https://gofile.io/d/sample123'; // Dùng link mẫu để demo step tiếp
            }

            // Bước 3: Lấy danh sách file MKV tĩnh từ Gofile
            console.log('\n[Bước 3] Tương tác Gofile API để lấy link file MKV tĩnh...');
            // Tách folderID từ URL (vd: https://gofile.io/d/XXXXXX -> XXXXXX)
            const folderIdMatch = gofileUrl.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
            if (folderIdMatch && folderIdMatch[1]) {
                const folderId = folderIdMatch[1];
                console.log(`🔍 Quét Gofile folder ID: ${folderId}`);
                
                try {
                    const mkvFiles = await gofileService.getMkvFilesFromFolder(folderId);
                    
                    if (mkvFiles.length > 0) {
                        // Lấy chính xác 40 tập đầu tiên
                        const targetFiles = mkvFiles.slice(0, 40);
                        console.log(`\n✅ Lấy đúng ${targetFiles.length} tập phim (yêu cầu 40 tập)`);
                        
                        for (const file of targetFiles) {
                            console.log(`\n📎 Đang xử lý tập: ${file.name}`);
                            console.log(`🔗 Gofile Download Link: ${file.link}`);
                            
                            // Bước 4: Remote Upload sang Play4Me / Abyss
                            await this.uploadToPremiumHosts(file.link, file.name);
                        }
                    } else {
                        console.log("⚠️ Thư mục Gofile trống hoặc không có file mkv/mp4.");
                    }
                } catch(goErr) {
                     console.log("⚠️ Bỏ qua quét Gofile API (do link mẫu mock hoặc chưa cấu hình token). Test Mock Upload...");
                     // Test upload mock link
                     await this.uploadToPremiumHosts('https://sample-mkv-link.com/video.mkv', targetMovieTitle);
                }
            } else {
                console.log(`⚠️ Link gofile không đúng chuẩn Folder. Không thể lấy mkv list.`);
            }

        } catch (error) {
            console.error("❌ Lỗi cục bộ tiến trình Hunter:", error);
        } finally {
            console.log("\n🧹 Dọn dẹp tài nguyên Browser...");
            await this.scraper.closeBrowser();
            console.log("✅ Hunter Run Complete.");
        }
    }

    /**
     * Bắn cắm Remote Upload qua Premium Hosts
     */
    async uploadToPremiumHosts(mkvUrl, title) {
        console.log(`\n[Bước 4] Đẩy Remote Upload sang Premium Hosts:`);
        
        // Push to Play4Me
        try {
            console.log(`  -> Gửi tới [Play4Me]...`);
            const p4mTaskId = await play4me.remoteUpload(mkvUrl, title);
            console.log(`  ✅ [Play4Me] Task tạo thành công! ID: ${p4mTaskId}`);
        } catch (e) {
            console.error(`  ❌ [Play4Me] Lỗi Upload:`, e.message);
        }

        // Push to Abyss via Background Queue
        console.log(`  -> Đưa [Abyss] vào hàng đợi chạy ngầm (Background Queue) để không làm chậm tiến trình...`);
        abyssUploadQueue.push({ mkvUrl, title });
        processAbyssQueue().catch(()=>{});
    }
}

// Nếu chạy trực tiếp file này (node mkvHunter.js)
if (require.main === module) {
    const hunter = new MkvHunter();
    hunter.startHunting();
}

module.exports = MkvHunter;