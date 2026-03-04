const axios = require('axios');
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const MovieDraft = require('../models/MovieDraft');

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';
const JACKETT_API_URL = process.env.JACKETT_API_URL || 'http://localhost:9117/api/v2.0/indexers/all/results';
const JACKETT_API_KEY = process.env.JACKETT_API_KEY || 'YOUR_JACKETT_API_KEY';
const OPENSUBTITLES_API_KEY = process.env.OPENSUBTITLES_API_KEY || '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isHunterRunning = false;

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
        const trackers = 'Tracker[]=nyaasi&Tracker[]=1337x&Tracker[]=torrentgalaxy';
        const baseQuery = encodeURIComponent(query + (year ? ' ' + year : ''));

        // Cú pháp tìm kiếm mồi chài (Thuyết Minh / Lồng Tiếng / Vietsub)
        console.log(`[JACKETT] Pass 1: Tìm bản có sẵn (Vietsub / Thuyết Minh)...`);
        const searchUrlVN = `${JACKETT_API_URL}?apikey=${JACKETT_API_KEY}&Query=${baseQuery}%20vietsub%20thuyet%20minh&Category[]=2000&Category[]=5000&${trackers}`;
        let res = await axios.get(searchUrlVN);
        let results = res.data.Results || [];

        // Nếu pass 1 (Việt) thất bại, fallback tìm bản RAW (Pass 2)
        if (results.length === 0) {
            console.log(`[JACKETT] Pass 2: Không thấy bản Việt, tìm bản gốc RAW...`);
            const searchUrlRAW = `${JACKETT_API_URL}?apikey=${JACKETT_API_KEY}&Query=${baseQuery}&Category[]=2000&Category[]=5000&${trackers}`;
            res = await axios.get(searchUrlRAW);
            results = res.data.Results || [];
        }

        if (results.length === 0) return null;

        const filtered = results.filter(r =>
            /1080p|2160p|4K|UHD/i.test(r.Title) &&
            !/CAM|TS|HC-SUBS/i.test(r.Title) &&
            r.Seeders >= 2
        );

        if (filtered.length === 0) return null;

        // [BẢO MẬT CẤP ĐỘ 8] Hệ thống chấm điểm Codec (Chống Mù Âm Thanh trên Trình Duyệt)
        const getScore = (title, seeders) => {
            let score = seeders; // Base score là số lượng Seeder
            const t = title.toLowerCase();

            // Ưu tiên chuẩn Web (Nhẹ, tương thích 100% Chrome/Safari/TV)
            if (t.includes('web-dl') || t.includes('webrip')) score += 50;
            if (t.includes('aac') || t.includes('eac3') || t.includes('dd5.1') || t.includes('dd+')) score += 50;

            // Phạt nặng bản Remux ổ cứng, âm thanh rạp (Trình duyệt chết lặng không giải mã được)
            if (t.includes('remux') || t.includes('dts-hd') || t.includes('truehd') || t.includes('dts')) score -= 100;

            return score;
        };

        filtered.sort((a, b) => getScore(b.Title, b.Seeders) - getScore(a.Title, a.Seeders));

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

// Tìm phụ đề tiếng Việt từ OpenSubtitles
async function searchOpenSubtitles(tmdbId, movieName, year) {
    if (!OPENSUBTITLES_API_KEY) return null;
    try {
        console.log(`[OPENSUBS] Tìm phụ đề Việt cho: ${movieName} (tmdb_id: ${tmdbId})`);

        // Ưu tiên tìm theo TMDB ID, fallback theo tên + năm
        const params = tmdbId
            ? { tmdb_id: tmdbId, languages: 'vi' }
            : { query: movieName, year, languages: 'vi' };

        const res = await axios.get('https://api.opensubtitles.com/api/v1/subtitles', {
            headers: {
                'Api-Key': OPENSUBTITLES_API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'FilmApp/1.0'
            },
            params
        });

        const data = res.data?.data;
        if (!data || data.length === 0) {
            console.log(`[OPENSUBS] Không tìm thấy phụ đề tiếng Việt.`);
            return null;
        }

        // Lấy sub có số downloads cao nhất
        const best = data.sort((a, b) =>
            (b.attributes.download_count || 0) - (a.attributes.download_count || 0)
        )[0];

        const fileId = best.attributes.files?.[0]?.file_id;
        if (!fileId) return null;

        // Lấy download URL
        const dlRes = await axios.post('https://api.opensubtitles.com/api/v1/download',
            { file_id: fileId },
            {
                headers: {
                    'Api-Key': OPENSUBTITLES_API_KEY,
                    'Content-Type': 'application/json',
                    'User-Agent': 'FilmApp/1.0'
                }
            }
        );

        const link = dlRes.data?.link;
        if (!link) return null;

        console.log(`[OPENSUBS] ✓ Tìm thấy phụ đề: ${best.attributes.release}`);
        return {
            url: link,
            language: 'vi',
            release: best.attributes.release,
            downloadCount: best.attributes.download_count || 0
        };
    } catch (err) {
        console.error('[OPENSUBS] Lỗi:', err.message);
        return null;
    }
}

async function run4KHunterBot() {
    if (isHunterRunning) {
        console.log('============= 🕵️ TRẠM KIỂM LÂM (HUNT MISSING 4K) ĐANG CHẠY RỒI =============');
        return { success: false, message: 'Bot đang chạy, vui lòng đợi.' };
    }
    isHunterRunning = true;
    const BATCH_SIZE = 100;
    console.log('============= 🕵️ TRẠM KIỂM LÂM (HUNT MISSING 4K) BẮT ĐẦU =============');

    try {
        // Lấy slug của phim đã có trong draft để skip
        const existingDrafts = await MovieDraft.find({}, 'slug').lean();
        const draftSlugs = new Set(existingDrafts.map(d => d.slug));

        // Hàm kiểm tra phim còn thiếu 4K hoặc metadata
        const needsWork = (movie) => {
            const has4K = movie.torrents && movie.torrents.some(t => /4K|1080p|2160p/i.test(t.quality));
            const hasMetadata = movie.actor?.length > 0 && movie.director?.length > 0 && movie.poster_url;
            return !has4K || !hasMetadata;
        };

        // === Ưu tiên 1: Phim gần đây CHƯA HOÀN THÀNH (ongoing) ===
        const ongoingMovies = await Movie.find({
            status: { $in: ['ongoing', 'trailer'] }
        })
            .sort({ year: -1, updatedAt: -1 })
            .lean();

        // === Ưu tiên 2: Phim hoàn thành, năm gần nhất ===
        const completedMovies = await Movie.find({
            status: { $nin: ['ongoing', 'trailer'] }
        })
            .sort({ year: -1, updatedAt: -1 })
            .lean();

        // Gộp theo thứ tự ưu tiên, lọc bỏ những phim đã có draft hoặc không cần xử lý
        const prioritizedMovies = [...ongoingMovies, ...completedMovies]
            .filter(m => !draftSlugs.has(m.slug) && needsWork(m))
            .slice(0, BATCH_SIZE);

        console.log(`[BOT] Hàng chờ: ${prioritizedMovies.length} phim (tối đa ${BATCH_SIZE}/lần).`);
        console.log(`[BOT]   - Ongoing: ${ongoingMovies.filter(m => !draftSlugs.has(m.slug) && needsWork(m)).length}`);
        console.log(`[BOT]   - Completed: ${completedMovies.filter(m => !draftSlugs.has(m.slug) && needsWork(m)).length}`);

        let processedCount = 0;
        let addedCount = 0;

        for (const movie of prioritizedMovies) {
            console.log(`\n--- Mục tiêu: ${movie.name} (${movie.slug}) [${movie.year}] [${movie.status}] ---`);

            const has4K = movie.torrents && movie.torrents.some(t => /4K|1080p|2160p/i.test(t.quality));
            const hasMetadata = movie.actor?.length > 0 && movie.director?.length > 0 && movie.poster_url;
            console.log(`    ⚠️ Nhược điểm: ${!has4K ? '[Thiếu 4K] ' : ''}${!hasMetadata ? '[Thiếu Siêu dữ liệu] ' : ''}`);

            let newMetadata = null;
            let newTorrent = null;
            const searchQuery = movie.origin_name || movie.name;

            await sleep(1500);
            newMetadata = await getTMDBDetailsByName(searchQuery, movie.year);

            if (!has4K) {
                await sleep(2000);
                const jackettQuery = (newMetadata && newMetadata.original_title) ? newMetadata.original_title : searchQuery;
                const jackettYear = (newMetadata && newMetadata.release_date) ? newMetadata.release_date.split('-')[0] : movie.year;
                newTorrent = await searchJackettMagnet(jackettQuery, jackettYear);
            }

            if (!newTorrent && (!(!hasMetadata) || !newMetadata)) {
                console.log(`    [Bất Lực] Bỏ qua.`);
                processedCount++;
                continue;
            }

            const draftData = { ...movie };
            delete draftData._id;
            delete draftData.__v;

            if (newMetadata) {
                const cast = newMetadata.credits?.cast ? newMetadata.credits.cast.slice(0, 5).map(c => c.name) : draftData.actor;
                const director = newMetadata.credits?.crew ? newMetadata.credits.crew.filter(c => c.job === 'Director').map(c => c.name) : draftData.director;
                draftData.actor = (cast && cast.length > 0) ? cast : draftData.actor;
                draftData.director = (director && director.length > 0) ? director : draftData.director;
                if (!draftData.poster_url || draftData.poster_url === '' || draftData.poster_url.includes('placeholder')) {
                    draftData.poster_url = newMetadata.poster_path ? `https://image.tmdb.org/t/p/w500${newMetadata.poster_path}` : draftData.poster_url;
                    draftData.thumb_url = newMetadata.backdrop_path ? `https://image.tmdb.org/t/p/w500${newMetadata.backdrop_path}` : draftData.thumb_url;
                }
            }

            if (newTorrent) {
                // Tìm phụ đề tiếng Việt từ OpenSubtitles
                await sleep(1000);
                const tmdbId = newMetadata?.id || null;
                const subtitle = await searchOpenSubtitles(tmdbId, movie.origin_name || movie.name, movie.year);

                if (!draftData.torrents) draftData.torrents = [];
                if (newTorrent.title.includes('4K') || newTorrent.title.includes('2160p')) {
                    draftData.torrents = draftData.torrents.filter(t => !/1080|HD/.test(t.quality));
                }
                draftData.torrents.push({
                    magnet: newTorrent.magnet,
                    quality: newTorrent.title.includes('4K') || newTorrent.title.includes('2160p') ? '4K' : '1080p',
                    size: newTorrent.size,
                    seeders: newTorrent.seeders,
                    isPremiumOnly: true,
                    subtitleUrl: subtitle?.url || null,
                    subtitleLanguage: subtitle ? 'vi' : null,
                    hasViSub: !!subtitle
                });
                if (subtitle) {
                    console.log(`    [OPENSUBS] ✓ Ph.đề Việt: ${subtitle.release}`);
                } else {
                    console.log(`    [OPENSUBS] Không tìm thấy phụ đề tiếng Việt.`);
                }
            }

            draftData.isActive = false;
            await MovieDraft.create(draftData);
            console.log(`    [XUẤT VIỆN] Đã đẩy sang MovieDraft.`);
            addedCount++;
            processedCount++;
        }

        console.log(`\n============= 🕵️ TRẠM KIỂM LÂM BÁO CÁO =============`);
        console.log(`- Đã xử lý: ${processedCount} phim (tối đa ${BATCH_SIZE}/lần)`);
        console.log(`- Đẩy vào MovieDraft: ${addedCount} phim.`);
        isHunterRunning = false;
        return { success: true, processed: processedCount, added: addedCount };

    } catch (err) {
        console.error('[HUNT 4K ERROR]', err);
        isHunterRunning = false;
        return { success: false, message: err.message };
    }
}



function getHunterStatus() {
    return { isRunning: isHunterRunning };
}

async function huntSingleMovie4K(slug) {
    try {
        const movie = await Movie.findOne({ slug });
        if (!movie) {
            return { success: false, message: `Không tìm thấy phim với slug: ${slug}` };
        }

        const isExistInDraft = await MovieDraft.findOne({ slug: movie.slug });
        if (isExistInDraft) {
            return { success: false, message: 'Phim đã có bản nháp chờ duyệt' };
        }

        const searchQuery = movie.origin_name || movie.name;

        console.log(`[HUNTER] Bắt đầu tìm kiếm 4K cho: ${searchQuery}`);

        await sleep(1500);
        const tmdbData = await getTMDBDetailsByName(searchQuery, movie.year);

        const jackettQuery = (tmdbData && tmdbData.original_title) ? tmdbData.original_title : searchQuery;
        const jackettYear = (tmdbData && tmdbData.release_date) ? tmdbData.release_date.split('-')[0] : movie.year;

        await sleep(1500);
        const newTorrent = await searchJackettMagnet(jackettQuery, jackettYear);

        if (!newTorrent) {
            return { success: false, message: 'Không tìm thấy kết quả Torrent 4K/1080p phù hợp' };
        }

        const draftData = movie.toObject();
        delete draftData._id;
        delete draftData.__v;

        if (tmdbData) {
            const cast = tmdbData.credits?.cast ? tmdbData.credits.cast.slice(0, 5).map(c => c.name) : draftData.actor;
            const director = tmdbData.credits?.crew ? tmdbData.credits.crew.filter(c => c.job === 'Director').map(c => c.name) : draftData.director;

            draftData.actor = (cast && cast.length > 0) ? cast : draftData.actor;
            draftData.director = (director && director.length > 0) ? director : draftData.director;

            if (!draftData.poster_url || draftData.poster_url === '' || draftData.poster_url.includes('placeholder')) {
                draftData.poster_url = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : draftData.poster_url;
                draftData.thumb_url = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w500${tmdbData.backdrop_path}` : draftData.thumb_url;
            }
        }

        // Tìm phụ đề tiếng Việt từ OpenSubtitles
        await sleep(1000);
        const tmdbId = tmdbData?.id || null;
        const subtitle = await searchOpenSubtitles(tmdbId, searchQuery, movie.year);

        if (!draftData.torrents) draftData.torrents = [];

        if (newTorrent.title.includes('4K') || newTorrent.title.includes('2160p')) {
            draftData.torrents = draftData.torrents.filter(t => !/1080|HD/.test(t.quality));
        }

        draftData.torrents.push({
            magnet: newTorrent.magnet,
            quality: newTorrent.title.includes('4K') || newTorrent.title.includes('2160p') ? '4K' : '1080p',
            size: newTorrent.size,
            seeders: newTorrent.seeders,
            isPremiumOnly: true,
            subtitleUrl: subtitle?.url || null,
            subtitleLanguage: subtitle ? 'vi' : null,
            hasViSub: !!subtitle
        });

        if (subtitle) {
            console.log(`[HUNTER] ✓ Phụ đề tiếng Việt: ${subtitle.release}`);
        } else {
            console.log(`[HUNTER] Không tìm thấy phụ đề tiếng Việt.`);
        }

        draftData.isActive = false;
        await MovieDraft.create(draftData);

        console.log(`[HUNTER] Thành công đẩy bản 4K của ${searchQuery} sang MovieDraft chờ duyệt!`);
        return { success: true, message: `Thành công tìm thấy bản ${newTorrent.title.includes('4K') || newTorrent.title.includes('2160p') ? '4K' : '1080p'}`, source: 'Jackett/Hunter' };

    } catch (err) {
        console.error('[HUNTER SINGLE] Lỗi:', err);
        return { success: false, message: err.message };
    }
}

module.exports = {
    run4KHunterBot,
    getHunterStatus,
    huntSingleMovie4K
};
