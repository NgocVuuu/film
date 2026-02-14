const mongoose = require('mongoose');
const Movie = require('./models/Movie');
require('dotenv').config();
const fs = require('fs');

async function countMovies() {
    let output = '';
    try {
        await mongoose.connect(process.env.MONGO_URI);
        output += 'Connected to MongoDB\n';

        const total = await Movie.countDocuments({});
        const active = await Movie.countDocuments({ isActive: { $ne: false } });
        const inactive = await Movie.countDocuments({ isActive: false });

        output += `Total movies: ${total}\n`;
        output += `Active movies (isActive != false): ${active}\n`;
        output += `Inactive movies (isActive == false): ${inactive}\n`;

        if (inactive > 0) {
            output += '\nSample inactive movies:\n';
            const samples = await Movie.find({ isActive: false }).limit(5).select('name slug updatedAt');
            samples.forEach(s => {
                output += `- ${s.name} (${s.slug}) - Updated At: ${s.updatedAt}\n`;
            });
        }

        await mongoose.disconnect();
        console.log(output);
        fs.writeFileSync('count_output.txt', output);
    } catch (err) {
        console.error(err);
        fs.writeFileSync('count_output.txt', 'Error: ' + err.message);
    }
}

countMovies();
