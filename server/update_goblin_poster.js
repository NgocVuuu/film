const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/Movie');

async function updateGoblinImage() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const goblinId = '69a292a9651d086678e0904b'; // Yeu Tinh (Goblin)

        const updated = await Movie.findByIdAndUpdate(
            goblinId,
            {
                $set: {
                    poster_url: 'https://img.ophim.live/uploads/movies/yeu-tinh-goblin-poster.jpg',
                    thumb_url: 'https://img.ophim.live/uploads/movies/yeu-tinh-goblin-thumb.jpg'
                }
            },
            { new: true }
        );

        if (updated) {
            console.log('Successfully updated Goblin poster URL!');
            console.log(`New Poster URL: ${updated.poster_url}`);
        } else {
            console.log('Movie not found!');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

updateGoblinImage();
