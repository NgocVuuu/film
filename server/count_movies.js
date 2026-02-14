const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

async function countMovies() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const total = await Movie.countDocuments({});
        const active = await Movie.countDocuments({ isActive: { $ne: false } });
        const inactive = await Movie.countDocuments({ isActive: false });

        console.log('Total movies:', total);
        console.log('Active movies (isActive != false):', active);
        console.log('Inactive movies (isActive == false):', inactive);

        if (inactive > 0) {
            console.log('\nSample inactive movies:');
            const samples = await Movie.find({ isActive: false }).limit(5).select('name slug updatedAt');
            samples.forEach(s => {
                console.log(`- ${s.name} (${s.slug}) - Updated At: ${s.updatedAt}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

countMovies();
