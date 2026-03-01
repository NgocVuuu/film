const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Movie = require('./models/Movie');
const movieController = require('./controllers/movieController');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pchill').then(async () => {

    // Mock req/res
    const req = {};
    const res = {
        json: (data) => {
            const movies = data.data;
            console.log(`Total Movies: ${movies.length}`);

            const fs2019 = movies.find(m => m.name.includes('Đường Bá Hổ') && m.year === 2019);
            const fs1993 = movies.find(m => m.name.includes('Đường Bá Hổ') && m.year === 1993);
            const lvt = movies.find(m => m.slug.includes('luc-van-tien'));
            const superGirl = movies.find(m => m.slug.includes('co-gai-de-thuong'));

            console.log("Found 2019 Flirting Scholar:", !!fs2019);
            console.log("Found 1993 Flirting Scholar:", !!fs1993);
            console.log("Found Luc Van Tien:", !!lvt);
            console.log("Found Super Girl:", !!superGirl);

            if (fs2019) console.log("ERROR: 2019 still included");
            if (lvt) console.log("ERROR: Luc Van Tien still included");
            if (superGirl) console.log("ERROR: Super Girl still included");

            process.exit(0);
        },
        status: (code) => ({ json: (data) => { console.error(code, data); process.exit(1); } })
    };

    await movieController.getStephenChowMovies(req, res);
});
