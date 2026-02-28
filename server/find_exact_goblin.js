const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Movie = require('./models/Movie');

async function findExactGoblin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const movies = await Movie.find({
            slug: { $in: ['yeu-tinh', 'yeu-tinh-goblin'] }
        });

        let out = `Found ${movies.length} movies.\n`;
        movies.forEach(movie => {
            out += `ID: ${movie._id}\n`;
            out += `Name: ${movie.name}\n`;
            out += `Origin Name: ${movie.origin_name}\n`;
            out += `Slug: ${movie.slug}\n`;
            out += `Thumb URL: ${movie.thumb_url}\n`;
            out += `Poster URL: ${movie.poster_url}\n`;
            out += `Year: ${movie.year}\n`;
            out += `Episode Total: ${movie.episode_total}\n`;
            out += `Content: ${movie.content.substring(0, 150)}...\n`;
            out += `\n`;
        });
        fs.writeFileSync('exact_goblin_output.txt', out, 'utf8');
        console.log('Saved output to exact_goblin_output.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

findExactGoblin();
