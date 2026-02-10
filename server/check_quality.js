const axios = require('axios');

const OPHIM = 'https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat';
const KKPHIM = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
const NGUONC = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat';

async function check() {
    try {
        console.log('--- OPHIM ---');
        const op = await axios.get(OPHIM);
        op.data.data.items.slice(0, 5).forEach(m => console.log(`${m.name}: ${m.quality} - ${m.lang}`));

        console.log('\n--- KKPHIM ---');
        const kk = await axios.get(KKPHIM);
        kk.data.items.slice(0, 5).forEach(m => console.log(`${m.name}: ${m.quality} - ${m.lang}`));

        console.log('\n--- NGUONC ---');
        const nc = await axios.get(NGUONC);
        nc.data.items.slice(0, 5).forEach(m => console.log(`${m.name}: ${m.quality} - ${m.lang}`));

    } catch (e) {
        console.error(e.message);
    }
}

check();
