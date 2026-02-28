const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/Movie');

async function checkDoctors() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // ID from Korean Drama route: slug is 'chuyen-tinh-bac-si'
        const updated = await Movie.findOneAndUpdate(
            { slug: 'chuyen-tinh-bac-si' },
            {
                $set: {
                    poster_url: 'https://img.ophim.live/uploads/movies/chuyen-tinh-bac-si-poster.jpg',
                    thumb_url: 'https://img.ophim.live/uploads/movies/chuyen-tinh-bac-si-thumb.jpg'
                }
            },
            { new: true }
        );

        if (updated) {
            console.log('Success!', updated.poster_url);
        } else {
            console.log('Movie not found!');
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

checkDoctors();
