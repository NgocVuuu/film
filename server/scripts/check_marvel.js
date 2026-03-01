const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const marvelMovies = [
    { en: 'Iron Man', year: 2008 },
    { en: 'The Incredible Hulk', year: 2008 },
    { en: 'Iron Man 2', year: 2010 },
    { en: 'Thor', year: 2011 },
    { en: 'Captain America: The First Avenger', year: 2011 },
    { en: 'The Avengers', year: 2012 },
    { en: 'Iron Man 3', year: 2013 },
    { en: 'Thor: The Dark World', year: 2013 },
    { en: 'Captain America: The Winter Soldier', year: 2014 },
    { en: 'Guardians of the Galaxy', year: 2014 },
    { en: 'Avengers: Age of Ultron', year: 2015 },
    { en: 'Ant-Man', year: 2015 },
    { en: 'Captain America: Civil War', year: 2016 },
    { en: 'Doctor Strange', year: 2016 },
    { en: 'Guardians of the Galaxy Vol. 2', year: 2017 },
    { en: 'Spider-Man: Homecoming', year: 2017 },
    { en: 'Thor: Ragnarok', year: 2017 },
    { en: 'Black Panther', year: 2018 },
    { en: 'Avengers: Infinity War', year: 2018 },
    { en: 'Ant-Man and the Wasp', year: 2018 },
    { en: 'Captain Marvel', year: 2019 },
    { en: 'Avengers: Endgame', year: 2019 },
    { en: 'Spider-Man: Far From Home', year: 2019 },
    { en: 'Black Widow', year: 2021 },
    { en: 'Shang-Chi and the Legend of the Ten Rings', year: 2021 },
    { en: 'Eternals', year: 2021 },
    { en: 'Spider-Man: No Way Home', year: 2021 },
    { en: 'Doctor Strange in the Multiverse of Madness', year: 2022 },
    { en: 'Thor: Love and Thunder', year: 2022 },
    { en: 'Black Panther: Wakanda Forever', year: 2022 },
    { en: 'Ant-Man and the Wasp: Quantumania', year: 2023 },
    { en: 'Guardians of the Galaxy Vol. 3', year: 2023 },
    { en: 'The Marvels', year: 2023 },
    { en: 'Deadpool & Wolverine', year: 2024 },
    { en: 'Captain America: Brave New World', year: 2025 },
    { en: 'Thunderbolts', year: 2025 },
    { en: 'The Fantastic Four: First Steps', year: 2025 },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const found = [];
    const missing = [];

    for (const movie of marvelMovies) {
        // Search by exact english name + exact year
        const result = await db.collection('movies').findOne({
            isActive: { $ne: false },
            year: movie.year,
            $or: [
                { origin_name: { $regex: `^${movie.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                { name: { $regex: `^${movie.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
            ]
        }, { projection: { name: 1, origin_name: 1, year: 1, slug: 1 } });

        if (result) {
            found.push({ en: movie.en, year: movie.year, dbName: result.name, dbOrigin: result.origin_name, slug: result.slug });
        } else {
            missing.push({ en: movie.en, year: movie.year });
        }
    }

    const output = {
        summary: `${found.length}/${marvelMovies.length} found, ${missing.length} missing`,
        found,
        missing
    };
    fs.writeFileSync('scripts/marvel_check2.json', JSON.stringify(output, null, 2), 'utf8');
    console.log('Done:', output.summary);
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
