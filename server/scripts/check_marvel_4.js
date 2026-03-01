const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const targets = [
    { en: 'The Incredible Hulk', year: 2008 },
    { en: 'Shang-Chi and the Legend of the Ten Rings', year: 2021 },
    { en: 'Eternals', year: 2021 },
    { en: 'The Fantastic Four: First Steps', year: 2025 },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const results = [];

    for (const t of targets) {
        // Search with and without year to find any match
        const movie = await db.collection('movies').findOne({
            $or: [
                { origin_name: { $regex: t.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                { name: { $regex: t.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
            ]
        });

        if (!movie) {
            results.push({ search: t.en, status: 'NOT_FOUND_IN_DB' });
            continue;
        }

        // Check episodes
        const eps = movie.episodes || [];
        const serverSummary = eps.map(server => {
            const items = server.server_data || [];
            const sample = items.slice(0, 2).map(ep => ({
                name: ep.filename || ep.name,
                link_m3u8: ep.link_m3u8 ? ep.link_m3u8.substring(0, 80) : null,
                link_embed: ep.link_embed ? ep.link_embed.substring(0, 80) : null,
            }));
            return {
                serverName: server.server_name,
                totalEps: items.length,
                sampleLinks: sample
            };
        });

        results.push({
            search: t.en,
            dbName: movie.name,
            dbOrigin: movie.origin_name,
            year: movie.year,
            slug: movie.slug,
            isActive: movie.isActive,
            episode_current: movie.episode_current,
            totalServers: eps.length,
            servers: serverSummary
        });
    }

    fs.writeFileSync('scripts/marvel_4_check.json', JSON.stringify(results, null, 2), 'utf8');
    console.log('Done. Check scripts/marvel_4_check.json');
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
