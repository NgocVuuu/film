const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Movie = require('./models/Movie');

async function findGoblin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const movies = await Movie.find({
            $or: [
                { name: { $regex: /Yêu Tinh/i } },
                { origin_name: { $regex: /Goblin/i } },
                { slug: { $regex: /yeu-tinh/i } }
            ]
        });

        let out = `Found ${movies.length} movies.\n`;
        movies.forEach(movie => {
            out += `ID: ${movie._id}\n`;
            out += `Name: ${movie.name}\n`;
            out += `Origin Name: ${movie.origin_name}\n`;
            out += `Slug: ${movie.slug}\n`;
            out += `Thumb URL: ${movie.thumb_url}\n`;
            out += `Poster URL: ${movie.poster_url}\n`;
            out += `\n`;
        });
        fs.writeFileSync('goblin_output.txt', out, 'utf8');
        console.log('Saved output to goblin_output.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

findGoblin();
