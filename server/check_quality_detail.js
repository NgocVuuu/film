const axios = require('axios');

const OPHIM_LIST = 'https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat';
const OPHIM_DETAIL = 'https://ophim1.com/v1/api/phim';

const KKPHIM_LIST = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
const KKPHIM_DETAIL = 'https://phimapi.com/phim';

const NGUONC_LIST = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat';
const NGUONC_DETAIL = 'https://phim.nguonc.com/api/film';

async function check() {
    try {
        // OPHIM
        const opList = await axios.get(OPHIM_LIST);
        if (opList.data.data.items.length > 0) {
            const slug = opList.data.data.items[0].slug;
            const detail = await axios.get(`${OPHIM_DETAIL}/${slug}`);
            console.log(`[OPHIM] ${detail.data.data.item.name}: Quality=${detail.data.data.item.quality}, Lang=${detail.data.data.item.lang}`);
        }

        // KKPHIM
        const kkList = await axios.get(KKPHIM_LIST);
        if (kkList.data.items.length > 0) {
            const slug = kkList.data.items[0].slug;
            const detail = await axios.get(`${KKPHIM_DETAIL}/${slug}`);
            console.log(`[KKPHIM] ${detail.data.movie.name}: Quality=${detail.data.movie.quality}, Lang=${detail.data.movie.lang}`);
        }

        // NGUONC
        const ncList = await axios.get(NGUONC_LIST);
        if (ncList.data.items.length > 0) {
            const slug = ncList.data.items[0].slug;
            const detail = await axios.get(`${NGUONC_DETAIL}/${slug}`);
            console.log(`[NGUONC] ${detail.data.movie.name}: Quality=${detail.data.movie.quality}, Lang=${detail.data.movie.lang}`);
        }

    } catch (e) {
        console.error(e.message);
    }
}

check();
