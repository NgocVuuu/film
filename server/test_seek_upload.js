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
        console.log('Testing upload WITHOUT folder...');
        const payload1 = {
            url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
            name: 'test_no_folder.mp4'
        };
        const res1 = await client.post('/api/v1/video/advance-upload', payload1);
        console.log('SUCCESS no folder:', res1.data);
    } catch (e) {
        console.log('FAILED no folder:', e.response?.status, e.response?.data);
    }

    try {
        console.log('\nTesting upload WITH folder local-Seekstreaming-The First Frost-S01-1780390250650...');
        const payload2 = {
            url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
            name: 'test_with_folder.mp4',
            folderId: 'local-Seekstreaming-The First Frost-S01-1780390250650'
        };
        const res2 = await client.post('/api/v1/video/advance-upload', payload2);
        console.log('SUCCESS with folder:', res2.data);
    } catch (e) {
        console.log('FAILED with folder:', e.response?.status, e.response?.data);
    }
}
run();
