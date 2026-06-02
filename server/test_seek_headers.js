require('dotenv').config();
const axios = require('axios');

const key = process.env.SEEKSTREAMING_API_KEY;
const baseUrl = 'https://seekstreaming.com';
const endpoint = '/api/v1/billing/balance';

const headersToTest = [
    { 'api-token': key },
    { 'API-Key': key },
    { 'X-API-Key': key },
    { 'Authorization': `Bearer ${key}` },
    { 'token': key },
    { 'x-api-token': key }
];

async function run() {
    for (const h of headersToTest) {
        try {
            console.log(`Testing headers: ${JSON.stringify(h)}`);
            const res = await axios.get(`${baseUrl}${endpoint}`, { headers: h });
            console.log(`SUCCESS with status: ${res.status}`);
            console.log('Data:', res.data);
            break;
        } catch (e) {
            console.log(`FAILED with status: ${e.response?.status}`);
        }
    }
}
run();
