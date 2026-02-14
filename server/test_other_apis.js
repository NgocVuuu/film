const axios = require('axios');

async function testAPIs() {
    const slug = 'bo-gia-phan-1'; // The Godfather Part 1 on KKPHIM usually

    // KKPHIM
    try {
        const url = `https://phimapi.com/phim/${slug}`;
        console.log(`\nFetching KKPHIM: ${url}...`);
        const res = await axios.get(url);
        if (res.data && res.data.movie) {
            const movie = res.data.movie;
            console.log('Name:', movie.name);
            console.log('Year:', movie.year);
            console.log('Category:', JSON.stringify(movie.category, null, 2));
        } else {
            console.log('KKPHIM: Not found');
        }
    } catch (e) { console.log('KKPHIM Error:', e.message); }
}

testAPIs();
