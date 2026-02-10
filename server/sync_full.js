const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const Movie = require('./models/Movie');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';
const OPHIM_API_LIST = 'https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat';
const OPHIM_API_DETAIL = 'https://ophim1.com/v1/api/phim';

async function syncPage(page) {
    console.log(`--- Đang đồng bộ trang ${page} ---`);
    try {
        const response = await axios.get(`${OPHIM_API_LIST}?page=${page}`);
        const data = response.data;

        if (!data.status || !data.data || !data.data.items) {
            console.error(`Không lấy được dữ liệu trang ${page}`);
            return;
        }

        const items = data.data.items;
        const pathImage = data.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
        const imageBase = pathImage.endsWith('/') ? pathImage : `${pathImage}/uploads/movies/`;

        for (const item of items) {
            const slug = item.slug;
            try {
                // Check if exists to avoid unnecessary detail calls (optional, but good for speed)
                // const exists = await Movie.findOne({ slug });
                // if (exists) { console.log(`Skipping ${slug}`); continue; }

                const detailRes = await axios.get(`${OPHIM_API_DETAIL}/${slug}`);
                if (!detailRes.data.status) continue;

                const movieData = detailRes.data.data.item;
                const episodes = detailRes.data.data.item.episodes;

                const thumb = movieData.thumb_url.startsWith('http') ? movieData.thumb_url : `${imageBase}${movieData.thumb_url}`;
                const poster = movieData.poster_url.startsWith('http') ? movieData.poster_url : `${imageBase}${movieData.poster_url}`;

                const updateData = {
                    name: movieData.name,
                    origin_name: movieData.origin_name,
                    slug: movieData.slug,
                    content: movieData.content,
                    type: movieData.type,
                    status: movieData.status,
                    thumb_url: thumb,
                    poster_url: poster,
                    is_copyright: movieData.is_copyright,
                    sub_docquyen: movieData.sub_docquyen,
                    chieurap: movieData.chieurap,
                    trailer_url: movieData.trailer_url,
                    time: movieData.time,
                    episode_current: movieData.episode_current,
                    episode_total: movieData.episode_total,
                    quality: movieData.quality,
                    lang: movieData.lang,
                    notify: movieData.notify,
                    showtimes: movieData.showtimes,
                    year: movieData.year,
                    view: movieData.view,
                    actor: movieData.actor,
                    director: movieData.director,
                    category: movieData.category,
                    country: movieData.country,
                    episodes: episodes,
                    updatedAt: new Date(movieData.modified?.time || Date.now())
                };

                await Movie.findOneAndUpdate({ slug: slug }, updateData, { upsert: true, new: true });
                // console.log(`Đã lưu: ${movieData.name}`);
                process.stdout.write('.');

            } catch (err) {
                // console.error(`Err detail ${slug}: ${err.message}`);
                process.stdout.write('x');
            }
        }
        console.log(`\nHoàn thành trang ${page}`);
    } catch (err) {
        console.error(`Lỗi trang ${page}:`, err.message);
    }
}

const run = async () => {
    await mongoose.connect(MONGO_URI);
    console.log('Connected DB. Strarting bulk sync (Pages 1-5)...');

    // Sync 5 pages for demo (approx 120 movies)
    for (let i = 1; i <= 5; i++) {
        await syncPage(i);
    }

    console.log('Bulk sync finished.');
    process.exit(0);
};

run();
