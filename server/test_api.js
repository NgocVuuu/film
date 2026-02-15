const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('https://ophim1.com/v1/api/tim-kiem?keyword=the%20big%20bang%20theory');
        console.log('Ophim Data Keys:', Object.keys(res.data.data));
        if (res.data.data.params) console.log('Ophim Params:', JSON.stringify(res.data.data.params, null, 2));
        console.log('Ophim Path Image:', res.data.data.pathImage);
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

test();
