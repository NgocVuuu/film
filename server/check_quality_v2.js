const axios = require('axios');

const KKPHIM = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
const NGUONC = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat';

async function check() {
    try {
        console.log('\n--- KKPHIM ---');
        const kk = await axios.get(KKPHIM);
        if (kk.data.items) {
            kk.data.items.slice(0, 5).forEach(m => console.log(`[KK] ${m.name}: ${m.quality}`));
        } else {
            console.log('KKPHIM: No items found');
        }
    } catch (e) { console.error('KKPHIM Error:', e.message); }

    try {
        console.log('\n--- NGUONC ---');
        const nc = await axios.get(NGUONC);
        if (nc.data.items) {
            nc.data.items.slice(0, 5).forEach(m => console.log(`[NC] ${m.name}: ${m.quality}`));
        } else {
            console.log('NGUONC: No items found');
        }
    } catch (e) { console.error('NGUONC Error:', e.message); }
}

check();
