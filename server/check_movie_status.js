const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();

async function checkMovie() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const movie = await Movie.findOne({ name: 'Còn Ra Thể Thống Gì Nữa' });
        if (movie) {
            console.log('Movie found:');
            console.log(JSON.stringify({
                _id: movie._id,
                name: movie.name,
                slug: movie.slug,
                isActive: movie.isActive
            }, null, 2));
        } else {
            console.log('Movie not found by exact name. Searching with regex...');
            const movies = await Movie.find({ name: /Còn Ra Thể Thống Gì Nữa/i });
            console.log('Found ' + movies.length + ' movies:');
            movies.forEach(m => {
                console.log(`- ${m.name} (${m.slug}): isActive=${m.isActive}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMovie();
