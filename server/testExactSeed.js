const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { syncSpecificMovie } = require('./crawler');
dotenv.config();

const missingSlugs = [
    'duong-ba-ho-diem-thu-huong',
    'tuyet-dinh-kungfu',
    'quyet-chien-giang-ho'
];

const seedExact = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pchill');
        console.log("Connected DB... Injecting exact 3 missing movies");

        for (const slug of missingSlugs) {
            console.log(`[SYNCING] Injecting ${slug}...`);
            const syncRes = await syncSpecificMovie(slug);
            if (syncRes.success) {
                console.log(`✅ Success for ${slug}`);
            } else {
                console.log(`❌ Failed for ${slug}:`, syncRes.message);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedExact();
