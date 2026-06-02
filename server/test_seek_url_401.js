require('dotenv').config();
const axios = require('axios');

const key = process.env.SEEKSTREAMING_API_KEY;
const baseUrl = 'https://seekstreaming.com';

const client = axios.create({
    baseURL: baseUrl,
    headers: {
        'api-token': key,
        'Content-Type': 'application/json'
    }
});

async function run() {
    try {
        console.log('Testing upload of a protected URL (httpstat.us/401)...');
        const payload = {
            url: 'https://httpstat.us/401',
            name: 'test_401_source.mp4'
        };
        const res = await client.post('/api/v1/video/advance-upload', payload);
        console.log('SUCCESS:', res.data);
    } catch (e) {
        console.log('FAILED:', e.response?.status, e.response?.data);
    }
}
run();
