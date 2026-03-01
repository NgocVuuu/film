const axios = require('axios');

async function findDoctors() {
    try {
        const res1 = await axios.get('https://ophim1.com/v1/api/tim-kiem?keyword=' + encodeURIComponent('Chuyện Tình Bác Sĩ'));
        console.log("Ophim:");
        res1.data?.data?.items?.forEach(i => console.log(i.name, i.origin_name, i.poster_url, i.thumb_url));

        const res2 = await axios.get('https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent('Chuyện Tình Bác Sĩ'));
        console.log("\nKKPhim:");
        res2.data?.data?.items?.forEach(i => console.log(i.name, i.origin_name, i.poster_url, i.thumb_url));

    } catch (e) {
        console.error(e);
    }
}

findDoctors();
