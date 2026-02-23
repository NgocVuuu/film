const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DCUMovies = [
    "Man of Steel",
    "Batman v Superman: Dawn of Justice",
    "Suicide Squad",
    "Wonder Woman",
    "Justice League",
    "Aquaman",
    "Shazam!",
    "Birds of Prey",
    "Wonder Woman 1984",
    "The Suicide Squad",
    "Black Adam",
    "Shazam! Fury of the Gods",
    "The Flash",
    "Blue Beetle",
    "Aquaman and the Lost Kingdom"
];

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        const Movie = require('./models/Movie');

        console.log("Checking DB for DCU movies...");
        const foundMovies = [];
        const missingMovies = [];

        for (const title of DCUMovies) {
            // Case insensitive search or regex
            const movie = await Movie.findOne({
                $or: [
                    { name: new RegExp(title, 'i') },
                    { origin_name: new RegExp(title, 'i') }
                ]
            }).select('name origin_name slug poster_url thumb_url year');

            if (movie) {
                foundMovies.push(movie);
                console.log(`[FOUND] ${title} -> ${movie.slug}`);
            } else {
                missingMovies.push(title);
                console.log(`[MISSING] ${title}`);
            }
        }

        console.log("\nSummary:");
        console.log(`Found: ${foundMovies.length}`);
        console.log(`Missing: ${missingMovies.length}`);

        const fs = require('fs');
        fs.writeFileSync('dcu_results.json', JSON.stringify({ foundMovies, missingMovies }, null, 2), 'utf-8');
        console.log("Results written to dcu_results.json");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDB();
