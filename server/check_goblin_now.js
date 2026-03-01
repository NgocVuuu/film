const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/Movie');

async function checkGoblin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const movie = await Movie.findById('69a292a9651d086678e0904b');
        console.log(movie.poster_url);
        console.log(movie.thumb_url);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

checkGoblin();
