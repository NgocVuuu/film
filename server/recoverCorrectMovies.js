const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { syncSpecificMovie } = require('./crawler');
dotenv.config();

const targetSlugs = [
    'duong-ba-ho-diem-thu-huong-vietsub',
    'duong-ba-ho-diem-thu-huong-1993',
    'quyet-chien-giang-ho-1989',
    'tuyet-dinh-kungfu-2004'
];

const recover = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pchill');

        for (const slug of targetSlugs) {
            console.log(`Trying specialized slug: ${slug}`);
            await syncSpecificMovie(slug);
        }
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}; recover();
