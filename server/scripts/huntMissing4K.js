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

async function getTMDBDetailsByName(query, year) {
    try {
        console.log(`[TMDB] Đang tìm Siêu Dữ Liệu cho: "${query}" (Năm: ${year || 'Khoảng này'})`);
        const searchRes = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=vi-VN${year ? `&year=${year}` : ''}`);

        if (searchRes.data.results && searchRes.data.results.length > 0) {
            const tmdbId = searchRes.data.results[0].id;
            const res = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=vi-VN&append_to_response=credits`);
            return res.data;
        }
        return null;
    } catch (err) {
        return null;
    }
}

async function searchJackettMagnet(query, year) {
    console.log(`[JACKETT] Đang Sục Bơm Magnet 4K/1080p: "${query} ${year ? year : ''}"`);
    try {
        const searchUrl = `${JACKETT_API_URL}?apikey=${JACKETT_API_KEY}&Query=${encodeURIComponent(query + (year ? ' ' + year : ''))}&Category[]=2000&Category[]=5000&Tracker[]=nyaasi&Tracker[]=sukebeinyaa&Tracker[]=avistaz&Tracker[]=1337x&Tracker[]=torrentgalaxy&Tracker[]=yts&Tracker[]=thepiratebay`;
        const res = await axios.get(searchUrl);

        const results = res.data.Results || [];
        if (results.length === 0) return null;

        const filtered = results.filter(r =>
            /1080p|2160p|4K|UHD/i.test(r.Title) &&
            !/CAM|TS|HC-SUBS/i.test(r.Title) &&
            r.Seeders >= 2
        );

        if (filtered.length === 0) return null;

        filtered.sort((a, b) => b.Seeders - a.Seeders);

        return {
            title: filtered[0].Title,
            magnet: filtered[0].MagnetUri,
            seeders: filtered[0].Seeders,
            size: (filtered[0].Size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        };

    } catch (err) {
        console.error('[JACKETT] Lỗi tìm Magnet:', err.message);
        return null;
    }
}

async function runHunter() {
    console.log('============= 🕵️ TRẠM KIỂM LÂM (HUNT MISSING 4K) BẤT ĐẦU =============');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('[DB] Đã kết nối MongoDB thành công.');
    } catch (err) {
        console.error('[DB] Lỗi kết nối MongoDB:', err.message);
        process.exit(1);
    }

    // 1. Quét kho báu
    const allMovies = await Movie.find();
    console.log(`[BOT] Tổng quan kho chứa: ${allMovies.length} bộ phim.`);

    let targetMovies = [];

    // 2. Lọc kép
    for (const movie of allMovies) {
        // Chỉ quét các phim Lẻ hoặc Series đang có (loại trừ các loại linh tinh nếu muốn)

        let needs4K = false;
        let needsMetadata = false;

        // Bệnh thứ nhất: Nghèo Magnet
        const hasHighQuality = movie.torrents && movie.torrents.some(t => /4K|1080p|2160p/i.test(t.quality));
        if (!hasHighQuality) {
            needs4K = true;
        }

        // Bệnh thứ hai: Dị tật bẩm sinh (Trống ảnh, trống diễn viên)
        if (!movie.actor || movie.actor.length === 0 || !movie.director || movie.director.length === 0 || !movie.poster_url || movie.poster_url === '') {
            needsMetadata = true;
        }

        if (needs4K || needsMetadata) {
            targetMovies.push({
                doc: movie,
                needs4K,
                needsMetadata
            });
        }
    }

    console.log(`[BỆNH NHÂN] Phát hiện ${targetMovies.length} bộ phim đang "Thiếu Cơ Trọng Tu" (Thiếu 4K hoặc Meta). Bắt đầu chiến dịch...`);

    let processedCount = 0;
    let addedCount = 0;

    for (const target of targetMovies) {
        const movie = target.doc;
        console.log(`\n--- Mục tiêu: ${movie.name} (${movie.slug}) ---`);
        console.log(`    ⚠️ Nhược điểm: ${target.needs4K ? '[Thiếu 4K] ' : ''}${target.needsMetadata ? '[Thiếu Siêu dữ liệu] ' : ''}`);

        // Chống Trùng Lặp 
        const isExistInDraft = await MovieDraft.findOne({ slug: movie.slug });
        if (isExistInDraft) {
            console.log(`    [Bỏ Qua] Thằng này tên ${movie.slug} đã được bắt bỏ vào Bệnh Viện (Draft) ngày hôm qua chờ Sếp duyệt rồi!`);
            continue;
        }

        let newMetadata = null;
        let newTorrent = null;

        const searchQuery = movie.origin_name || movie.name;

        // 3. Phẫu thuật Thẩm mỹ (Bơm TMDB) - Chỉ làm khi thiếu Metadata HOẶC cần tên tiếng Anh để search Jackett
        await sleep(1500);
        newMetadata = await getTMDBDetailsByName(searchQuery, movie.year);

        // 4. Tìm thuốc trường sinh 4K
        if (target.needs4K) {
            await sleep(2000);

            // Ưu tiên tên từ TMDB (Vì nó trả về Original English Name chuẩn hơn là tên Tàu/Hàn có sẵn trên web)
            const jackettQuery = (newMetadata && newMetadata.original_title) ? newMetadata.original_title : searchQuery;
            const jackettYear = (newMetadata && newMetadata.release_date) ? newMetadata.release_date.split('-')[0] : movie.year;

            newTorrent = await searchJackettMagnet(jackettQuery, jackettYear);
        }

        // Nếu không có tiến triển gì thì thôi
        if (!newTorrent && (!target.needsMetadata || !newMetadata)) {
            console.log(`    [Bất Lực] Quét sạch tứ phương tám hướng vẫn không cứu được ca này. Bỏ qua chờ ngày Lạc trôi! 🥲`);
            continue;
        }

        // 5. Chuẩn bị hồ sơ Bệnh Án mới (Góp nhặt từ Đống cũ + Phép thuật mới)
        const draftData = movie.toObject();
        delete draftData._id; // Rất quan trọng, phải xóa ID cũ để tạo mới bên Database Draft
        delete draftData.__v;

        // Đắp Siêu dữ liệu TMDB (Nếu TMDB trả ra kết quả có thật)
        if (newMetadata) {
            console.log(`    [TMDB] Đã hốt được Siêu Dữ Liệu mới! Đang đắp Actor, Director, Poster...`);
            const cast = newMetadata.credits?.cast ? newMetadata.credits.cast.slice(0, 5).map(c => c.name) : draftData.actor;
            const director = newMetadata.credits?.crew ? newMetadata.credits.crew.filter(c => c.job === 'Director').map(c => c.name) : draftData.director;

            draftData.actor = (cast && cast.length > 0) ? cast : draftData.actor;
            draftData.director = (director && director.length > 0) ? director : draftData.director;

            // Chỉ đè poster nếu poster cũ trống hoặc là placeholder
            if (!draftData.poster_url || draftData.poster_url === '' || draftData.poster_url.includes('placeholder')) {
                draftData.poster_url = newMetadata.poster_path ? `https://image.tmdb.org/t/p/w500${newMetadata.poster_path}` : draftData.poster_url;
                draftData.thumb_url = newMetadata.backdrop_path ? `https://image.tmdb.org/t/p/w500${newMetadata.backdrop_path}` : draftData.thumb_url;
            }
        }

        // Bơm Magnet 4K 
        if (newTorrent) {
            console.log(`    [JACKETT] Ổn áp! Bơm Magnet 4K: Size ${newTorrent.size} | Seeders: ${newTorrent.seeders}`);

            // Thay vì ghi đè mất cái hiện có, ta append (hoặc chèn luôn nếu mảng rỗng)
            if (!draftData.torrents) draftData.torrents = [];

            // Xóa rác 1080p nếu đã cào được con 4K 
            if (newTorrent.title.includes('4K') || newTorrent.title.includes('2160p')) {
                draftData.torrents = draftData.torrents.filter(t => !/1080|HD/.test(t.quality));
            }

            draftData.torrents.push({
                magnet: newTorrent.magnet,
                quality: newTorrent.title.includes('4K') || newTorrent.title.includes('2160p') ? '4K' : '1080p',
                size: newTorrent.size,
                seeders: newTorrent.seeders,
                isPremiumOnly: true
            });
        }

        draftData.isActive = false; // Phải Cắt ly chờ Sếp duyệt

        // Đẩy vào Bệnh viện (MovieDraft)
        await MovieDraft.create(draftData);
        console.log(`    [XUẤT VIỆN] Đã đẩy bé nó sang phòng hồi sức tíc cực (MovieDraft) chờ ngày Admin duyệt là đổi đời!`);
        addedCount++;
        processedCount++;
    }

    console.log(`\n============= 🕵️ TRẠM KIỂM LÂM BÁO CÁO =============`);
    console.log(`- Phát hiện: ${targetMovies.length} phim Thiếu 4K hoặc Siêu Dữ Liệu`);
    console.log(`- Đã Đắp nặn & Cách ly thành công (MovieDraft): ${addedCount} phim.`);
    console.log(`- Mọi sự bây giờ chờ Sếp vào Admin Panel -> Phim Khảo cổ -> Bấm nút là Xong!`);

    mongoose.disconnect();
    process.exit(0);
}

runHunter();
