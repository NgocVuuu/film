const axios = require('axios');

async function checkNguonC() {
    try {
        const slug = 'kuroko-no-basket-3rd-season';
        const url = `https://phim.nguonc.com/api/film/${slug}`;
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);

        console.log('\nNGUONC Movie Data:');
        if (res.data && res.data.movie) {
            const movie = res.data.movie;
            console.log('Name:', movie.name);
            console.log('Year:', movie.year);
            console.log('Category:', JSON.stringify(movie.category, null, 2));
            console.log('Raw movie keys:', Object.keys(movie));
        } else {
            console.log('No movie data found:', res.data);
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkNguonC();
