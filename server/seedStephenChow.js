const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { syncSpecificMovie } = require('./crawler');
const axios = require('axios');
dotenv.config();

const stephenChowMovies = [
    "Quyết Chiến Giang Hồ", "Anh Hùng Của Tôi", "Đỗ Thánh", "Sư Huynh Trúng Tà",
    "Tình Yêu Và Cuộc Đời", "Trà Lầu Long Phụng", "Vô Địch Vận Hạnh Tinh", "Vỏ Quýt Dày Có Móng Tay Nhọn",
    "Chuyên Gia Xảo Quyệt", "Đỗ Thánh 2", "Đỗ Thánh 3", "Tân Tinh Võ Môn", "Tân Tinh Võ Môn 2",
    "Tình Thánh", "Trường Học Uy Long", "Long Tích Truyền Nhân", "Gia Hữu Hỷ Sự",
    "Trạng Nguyên Tô Khất Nhi", "Trường Học Uy Long 2", "Xẩm Xử Quan", "Tân Lộc Đỉnh Ký",
    "Tân Lộc Đỉnh Ký 2", "Đường Bá Hổ Điểm Thu Hương", "Tế Công", "Trường Học Uy Long 3",
    "Quan Xẩm Lốc Cốc", "Quốc Sản 007", "Vua Phá Hoại", "Bách Biến Tinh Quân",
    "Chuyên Gia Bắt Ma", "Tây Du Ký: Nguyệt Quang Bảo Hạp", "Tây Du Ký: Tiên Lý Kì Duyên",
    "Đại Nội Mật Thám", "Thần Ăn", "Trạng Sư Xảo Quyệt", "Hoàng Tử Bánh Trứng",
    "Phán Xét Cuối Cùng", "Tình Anh Thợ Cạo", "Bịp Vương 2000", "Vua Hài Kịch",
    "Đội Bóng Thiếu Lâm", "Tuyệt Đỉnh Kungfu", "Siêu Khuyển Thần Thông",
    "Tây Du Ký: Mối Tình Ngoại Truyện", "Mỹ Nhân Ngư", "Tây Du Ký: Mối Tình Ngoại Truyện 2", "Tuyệt đỉnh Kungfu 2"
];

const findBestSlug = async (movieName) => {
    try {
        console.log(`[SEARCH] Querying APIs for "${movieName}"...`);
        const results = await Promise.allSettled([
            axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 }),
            axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 }),
            axios.get(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(movieName)}`, { timeout: 5000 })
        ]);

        let bestSlug = null;
        let priority = -1;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const data = result.value.data;
                const items = (index === 2) ? data?.items : (data?.data?.items || data?.items);
                if (!items || !items.length) return;

                // For Châu Tinh Trì movies, usually the first returned match is the correct one,
                // but we try to do a loose string matching to be safe.
                const expectedNormalized = movieName.toLowerCase().replace(/[^a-z0-9]/g, '');

                for (const item of items) {
                    const originNorm = (item.origin_name || item.original_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const nameNorm = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (originNorm.includes(expectedNormalized) || nameNorm.includes(expectedNormalized) || expectedNormalized.includes(nameNorm)) {
                        const currentPriority = (index === 0 || index === 1) ? 2 : 1;
                        if (currentPriority > priority) {
                            bestSlug = item.slug;
                            priority = currentPriority;
                        }
                    }
                }

                // Fallback: If no exact match but we have results, take the first one (often search handles aliases well)
                if (!bestSlug && items.length > 0) {
                    bestSlug = items[0].slug;
                    priority = (index === 0 || index === 1) ? 2 : 1;
                }
            }
        });

        return bestSlug;
    } catch (error) {
        console.error(`[SEARCH ERROR] Failed querying for ${movieName}`, error.message);
        return null;
    }
};

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        console.log("Connected DB... Starting Stephen Chow Seeder");

        let seededCount = 0;

        for (const title of stephenChowMovies) {
            const slug = await findBestSlug(title);
            if (slug) {
                console.log(`[FOUND SLUG] ${title} -> ${slug}`);
                console.log(`[SYNCING] Injecting ${slug} into database...`);
                const syncRes = await syncSpecificMovie(slug);
                if (syncRes.success) {
                    console.log(`✅ Successfully seeded: ${title}`);
                    seededCount++;
                } else {
                    console.error(`❌ DB Sync failed for ${title}:`, syncRes.message);
                }
            } else {
                console.log(`⚠️ No exact slug found for "${title}" across providers.`);
            }

            await new Promise(r => setTimeout(r, 1500));
        }

        console.log(`\n\n[DONE] Seeded ${seededCount} / ${stephenChowMovies.length} movies.`);
        process.exit(0);

    } catch (e) {
        console.error("FATAL ERROR", e);
        process.exit(1);
    }
}

seedDB();
