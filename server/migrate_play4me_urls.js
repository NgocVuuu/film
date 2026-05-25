require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
    console.log('Connected to DB');

    const movies = await Movie.find({ 'episodes.server_name': /PChill - Play4Me/i });
    console.log(`Found ${movies.length} movies with Play4Me server.`);

    let updateCount = 0;

    for (const movie of movies) {
        let changed = false;
        for (const server of movie.episodes) {
            if (server.server_name && server.server_name.includes('PChill - Play4Me')) {
                for (const ep of server.server_data) {
                    if (ep.link_embed && ep.link_embed.includes('player4me.com/embed/')) {
                        const match = ep.link_embed.match(/\/embed\/([a-zA-Z0-9_-]+)/);
                        if (match && match[1]) {
                            ep.link_embed = `https://pchill-play.online/#${match[1]}`;
                            changed = true;
                        }
                    } else if (ep.link_embed && ep.link_embed.startsWith('https://pchill-play.online/?api=')) {
                        // Restore from the bad migration
                        const videoId = ep.link_embed.split('#')[1];
                        if (videoId) {
                            ep.link_embed = `https://pchill-play.online/#${videoId}`;
                            changed = true;
                        }
                    }
                }
            }
        }
        if (changed) {
            await movie.save();
            updateCount++;
            console.log(`Updated URLs for movie: ${movie.name}`);
        }
    }

    console.log(`Migration complete. Updated ${updateCount} movies.`);
    process.exit(0);
}

migrate().catch(console.error);
