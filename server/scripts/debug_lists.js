const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const categoriesToCheck = [
            { name: 'Action (Hành Động)', slug: 'hanh-dong' },
            { name: 'Comedy (Hài Hước)', slug: 'hai-huoc' },
            { name: 'Crime (Hình Sự)', slug: 'hinh-su' },
            { name: 'Sci-Fi (Viễn Tưởng)', slug: 'vien-tuong' },
            { name: 'War (Chiến Tranh)', slug: 'chien-tranh' },
            { name: 'Mystery (Bí Ẩn)', slug: 'bi-an' },
            { name: 'Mythology (Thần Thoại)', slug: 'than-thoai' },
            { name: 'Documentary (Tài Liệu)', slug: 'tai-lieu' },
            { name: 'TV Shows', slug: 'chuong-trinh-truyen-hinh' }
        ];

        for (const cat of categoriesToCheck) {
            console.log(`\n--- Analyzing ${cat.name} ---`);
            const distribution = await Movie.aggregate([
                { $match: { 'category.slug': cat.slug } },
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ]);
            console.log(distribution);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
