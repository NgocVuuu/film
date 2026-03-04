const axios = require('axios');
const mongoose = require('mongoose');
const slugify = require('slugify');
require('dotenv').config();

// Mongoose Models
const Movie = require('../models/Movie');
const MovieDraft = require('../models/MovieDraft');

// Configs
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';
const JACKETT_API_URL = process.env.JACKETT_API_URL || 'http://localhost:9117/api/v2.0/indexers/all/results';
const JACKETT_API_KEY = process.env.JACKETT_API_KEY || 'YOUR_JACKETT_API_KEY';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

// Hàm Sleep chống Rate Limit
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getTMDBTrending() {
    console.log('[TMDB] Đang cào danh sách phim Trending tuần này...');
    try {
        const res = await axios.get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=vi-VN`);
        return res.data.results || [];
    } catch (err) {
        console.error('[TMDB] Lỗi khi gọi API:', err.message);
        return [];
    }
}

async function getTMDBDetails(tmdbId) {
    try {
        const res = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=vi-VN&append_to_response=credits`);
        return res.data;
    } catch (err) {
        return null;
    }
}

async function searchJackettMagnet(query, year) {
    console.log(`[JACKETT] Đang lùng sục Torrent 4K/1080p cho từ khóa: "${query} ${year}"`);
    try {
        const searchUrl = `${JACKETT_API_URL}?apikey=${JACKETT_API_KEY}&Query=${encodeURIComponent(query + ' ' + year)}&Category[]=2000&Category[]=5000&Tracker[]=nyaasi&Tracker[]=sukebeinyaa&Tracker[]=avistaz&Tracker[]=1337x&Tracker[]=torrentgalaxy&Tracker[]=yts&Tracker[]=thepiratebay`;
        const res = await axios.get(searchUrl);

        const results = res.data.Results || [];
        if (results.length === 0) return null;

        // Ưu tiên bản có dung lượng lớn (chất lượng cao) và nhiều Seeders
        // Lọc các bản có "4K", "1080p", "WEB-DL", "BluRay"
        const filtered = results.filter(r =>
            /1080p|2160p|4K|UHD/i.test(r.Title) &&
            !/CAM|TS|HC-SUBS/i.test(r.Title) &&
            r.Seeders >= 2
        );

        if (filtered.length === 0) return null;

        // Trả về kết quả tốt nhất (nhiều seeder)
        filtered.sort((a, b) => b.Seeders - a.Seeders);

        return {
            title: filtered[0].Title,
            magnet: filtered[0].MagnetUri,
            seeders: filtered[0].Seeders,
            size: (filtered[0].Size / (1024 * 1024 * 1024)).toFixed(2) + ' GB', // Convert bytes to GB
        };

    } catch (err) {
        console.error('[JACKETT] Lỗi khi tìm Magnet:', err.message);
        return null;
    }
}

async function runSpider() {
    console.log('============= SPIDER BOT STARTED =============');

    // Connect DB
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[DB] Kết nối MongoDB thành công.');
    } catch (err) {
        console.error('[DB] Lỗi kết nối MongoDB:', err.message);
        process.exit(1);
    }

    const trendingMovies = await getTMDBTrending();
    console.log(`[BOT] Tìm thấy ${trendingMovies.length} phim Hot. Bắt đầu xử lý...`);

    let processedCount = 0;
    let addedCount = 0;

    for (const item of trendingMovies) {
        // Tạo slug chuẩn từ tên gốc hoặc tên tiếng việt
        const baseTitle = item.original_title || item.title;
        const slug = slugify(baseTitle, { lower: true, strict: true }) + '-' + (item.release_date ? item.release_date.split('-')[0] : '');

        console.log(`\n--- Phim: ${item.title} (${slug}) ---`);

        // 1. Chống Trùng Lặp (Deduplication Check)
        const isExistInProd = await Movie.findOne({ slug: slug });
        if (isExistInProd) {
            // Kiểm tra xem phim này đã có nguồn Torrent 4K/1080p chưa
            const hasHighQuality = isExistInProd.torrents && isExistInProd.torrents.some(t => /4K|1080p|2160p/i.test(t.quality) || /HD/i.test(t.quality));
            if (hasHighQuality) {
                console.log('[Bỏ Qua] Phim ĐÃ CÓ sẵn bản đẹp 4K/1080p trên Web Chính.');
                continue;
            } else {
                console.log('[Bổ Sung 4K] Phim CŨ trên Web chưa có bản 4K ngon. Bot sẽ cố gắng cào bản 4K/1080p về Nháp!');
            }
        }

        const isExistInDraft = await MovieDraft.findOne({ slug: slug });
        if (isExistInDraft) {
            console.log('[Bỏ Qua] Phim ĐÃ CẠO HÔM QUA (Đang nằm chờ duyệt trong Nháp).');
            continue;
        }

        // 2. Kéo thông tin chi tiết (Lấy diễn viên, thể loại)
        await sleep(1000); // Chống Rate Limit TMDB
        const details = await getTMDBDetails(item.id);
        if (!details) continue;

        // 3. Truy Bắt Magnet (Qua mạng lưới Jackett)
        const year = details.release_date ? details.release_date.split('-')[0] : '';
        // Ưu tiên tìm Tên English để rò ra Nguồn nước ngoài
        const searchQuery = details.original_title || details.title;

        await sleep(2000); // Tôn trọng Rate Limit Jackett
        const torrentData = await searchJackettMagnet(searchQuery, year);

        if (!torrentData || !torrentData.magnet) {
            console.log('[Jackett] Đã quét sạch nhưng chưa có bản WEB-DL/Bluray 4K nào ngon. Chờ vài ngày nữa cào lại!');
            continue;
        }

        console.log(`[Jackett] Thơm! Tìm thấy cục Magnet 4K: Size ${torrentData.size} | Seeders: ${torrentData.seeders}`);

        // 4. Bơm Dữ Liệu Vào Bảng Nháp (MovieDraft)
        // Lọc Actor
        const cast = details.credits?.cast ? details.credits.cast.slice(0, 5).map(c => c.name) : [];
        const director = details.credits?.crew ? details.credits.crew.filter(c => c.job === 'Director').map(c => c.name) : [];

        const draftData = {
            name: details.title,
            origin_name: details.original_title,
            slug: slug,
            content: details.overview,
            type: 'single', // Phim lẻ
            status: 'completed',
            thumb_url: `https://image.tmdb.org/t/p/w500${details.backdrop_path || details.poster_path}`,
            poster_url: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
            time: details.runtime ? `${details.runtime} Phút` : '',
            episode_current: 'Full',
            episode_total: '1/1',
            quality: 'HD',
            lang: 'Vietsub',
            year: year ? parseInt(year) : 0,
            actor: cast,
            director: director,
            category: details.genres.map(g => ({ id: g.id.toString(), name: g.name, slug: slugify(g.name, { lower: true }) })),
            country: details.production_countries.map(c => ({ id: c.iso_3166_1, name: c.name, slug: slugify(c.name, { lower: true }) })),
            torrents: [{
                magnet: torrentData.magnet,
                quality: torrentData.title.includes('4K') || torrentData.title.includes('2160p') ? '4K' : '1080p',
                size: torrentData.size,
                seeders: torrentData.seeders,
                isPremiumOnly: true
            }],
            isActive: false, // TUYỆT ĐỐI NHỐT TRONG KHU VỰC CÁCH LY
            is_copyright: false
        };

        await MovieDraft.create(draftData);
        console.log(`[Thành Công] Đã nhốt phim ${details.title} vào khu vực Cách Ly (MovieDraft) mĩ mãn!`);
        addedCount++;
        processedCount++;
    }

    console.log(`\n============= SPIDER BÁO CÁO =============`);
    console.log(`- Đã duyệt: ${trendingMovies.length} phim Hot`);
    console.log(`- Đã cào và Cách ly Dữ liệu (MovieDraft): ${addedCount} phim.`);
    console.log(`- Cấp trên (Admin) có thể vào Admin Panel kiểm duyệt phim mới vào sáng mai.`);

    mongoose.disconnect();
    process.exit(0);
}

runSpider();
