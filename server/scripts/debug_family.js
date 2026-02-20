const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Movie = require('../models/Movie');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        console.log('\n--- Checking Cartoon/Anime (type: hoathinh) ---');
        const cartoons = await Movie.find({ type: 'hoathinh', isActive: { $ne: false } })
            .sort({ year: -1, updatedAt: -1 })
            .limit(5)
            .select('name original_name category slug');

        cartoons.forEach(m => {
            const cats = m.category.map(c => c.name).join(', ');
            console.log(`[Cartoon] ${m.name} | Cats: ${cats}`);
        });

        console.log('\n--- Checking Family (category: gia-dinh) ---');
        const family = await Movie.find({ 'category.slug': 'gia-dinh', isActive: { $ne: false } })
            .sort({ year: -1, updatedAt: -1 })
            .limit(5)
            .select('name original_name type category slug');

        family.forEach(m => {
            const cats = m.category.map(c => c.name).join(', ');
            console.log(`[Family] [${m.type}] ${m.name} | Cats: ${cats}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
