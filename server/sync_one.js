const axios = require('axios');
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';
const OPHIM_API_DETAIL = 'https://ophim1.com/v1/api/phim';

async function syncOne(slug) {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`Syncing ${slug}...`);

        const detailRes = await axios.get(`${OPHIM_API_DETAIL}/${slug}`);
        const data = detailRes.data;

        if (!data.status) {
            console.error('API Error:', data.msg);
            return;
        }

        const movieData = data.data.item;
        const episodes = movieData.episodes;

        console.log('Episodes found:', episodes.length);
        if (episodes.length > 0) {
            console.log('First episode link:', episodes[0].server_data[0].link_m3u8);
        }

        const pathImage = data.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
        const imageBase = pathImage.endsWith('/') ? pathImage : `${pathImage}/uploads/movies/`;

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
            year: movieData.year,
            actor: movieData.actor,
            director: movieData.director,
            category: movieData.category,
            country: movieData.country,
            episodes: episodes,
            updatedAt: new Date()
        };

        await Movie.findOneAndUpdate({ slug: slug }, updateData, { upsert: true, new: true });
        console.log('Update success!');

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

const slug = process.argv[2];
if (slug) {
    syncOne(slug);
} else {
    console.log('Please provide a slug');
}
