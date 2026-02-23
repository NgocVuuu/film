const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function searchAndSync(keyword) {
    console.log(`\nSearching for: "${keyword}"`);

    // Try KKPhim search
    try {
        const res = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, { timeout: 8000 });
        const items = res.data?.data?.items || [];
        console.log(`KKPhim found ${items.length} results:`);
        items.slice(0, 5).forEach(m => console.log(`  - "${m.name}" / "${m.origin_name}" (${m.year}) slug: ${m.slug}`));
        return items;
    } catch (e) {
        console.log(`KKPhim error: ${e.message}`);
    }
    return [];
}

async function syncSlug(slug) {
    const { syncSpecificMovie } = require('../crawler');
    console.log(`\nSyncing slug: ${slug}`);
    try {
        const result = await syncSpecificMovie(slug);
        if (result && result.success) {
            console.log(`SUCCESS: synced ${slug}`);
            return true;
        }
        console.log(`Failed to sync: ${slug}`);
    } catch (e) {
        console.log(`Sync error: ${e.message}`);
    }
    return false;
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Search for correct slugs
    const shangChiItems = await searchAndSync('Shang-Chi and the Legend of the Ten Rings');
    const fantasticItems = await searchAndSync('The Fantastic Four First Steps');

    // Try to sync using found slugs
    for (const item of shangChiItems.slice(0, 3)) {
        if (item.slug) {
            const ok = await syncSlug(item.slug);
            if (ok) break;
        }
    }
    for (const item of fantasticItems.slice(0, 3)) {
        if (item.slug) {
            const ok = await syncSlug(item.slug);
            if (ok) break;
        }
    }

    console.log('\nAll done.');
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
