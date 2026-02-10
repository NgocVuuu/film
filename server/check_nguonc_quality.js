const axios = require('axios');

const NGUONC_LIST = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat';
const NGUONC_DETAIL = 'https://phim.nguonc.com/api/film';

async function check() {
    try {
        const ncList = await axios.get(NGUONC_LIST);
        if (ncList.data.items.length > 0) {
            const items = ncList.data.items.slice(0, 10);
            for (const item of items) {
                try {
                    const detail = await axios.get(`${NGUONC_DETAIL}/${item.slug}`);
                    console.log(`[NGUONC] ${detail.data.movie.name}: Quality=${detail.data.movie.quality}`);
                } catch (e) {
                    console.log(`Error checking ${item.slug}`);
                }
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

check();
