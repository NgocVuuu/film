const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function search(keyword) {
    try {
        // Try Ophim
        const r = await axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=5`, { timeout: 10000 });
        const items = r.data?.data?.items || [];
        if (items.length > 0) {
            console.log(`Ophim found ${items.length}:`);
            items.forEach(m => console.log(`  "${m.name}" / "${m.origin_name}" (${m.year}) slug: ${m.slug}`));
            return { source: 'ophim', items };
        }
    } catch (e) { console.log('Ophim err:', e.message); }

    try {
        // Try KKPhim different endpoint
        const r = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=5`, { timeout: 10000 });
        const items = r.data?.data?.items || [];
        console.log(`KKPhim found ${items.length}:`);
        items.forEach(m => console.log(`  "${m.name}" / "${m.origin_name}" (${m.year}) slug: ${m.slug}`));
        return { source: 'kkphim', items };
    } catch (e) { console.log('KKPhim err:', e.message); }

    return { items: [] };
}

async function syncSlug(slug) {
    const { syncSpecificMovie } = require('../crawler');
    console.log(`\nSyncing: ${slug}`);
    try {
        const result = await syncSpecificMovie(slug);
        if (result?.success) { console.log(`SUCCESS`); return true; }
        console.log(`Failed`);
    } catch (e) { console.log(`Error: ${e.message}`); }
    return false;
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Try multiple search terms
    for (const kw of ['Fantastic Four First Steps', 'Bo Tu Sieu Dang', 'Fantastic Four 2025']) {
        console.log(`\n--- Searching: "${kw}" ---`);
        const { items } = await search(kw);
        for (const item of items.slice(0, 2)) {
            if (item.slug) { const ok = await syncSlug(item.slug); if (ok) { await mongoose.disconnect(); process.exit(0); } }
        }
    }
    console.log('\nNot found on any source yet.');
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
