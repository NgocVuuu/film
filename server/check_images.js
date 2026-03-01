const https = require('https');

function checkUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            resolve(res.statusCode);
        }).on('error', (e) => {
            resolve(e.message);
        });
    });
}

async function main() {
    const urls = [
        'https://phimimg.com/upload/vod/20240702-1/7b973ae226a1da0b3fe0f804ba3ca74f.jpg',
        'https://phimimg.com/upload/vod/20240702-1/f856a9d55ecba0142bfb338d4d519859.jpg',
        'https://img.ophim.live/uploads/movies/yeu-tinh-thumb.jpg',
        'https://img.ophim.live/uploads/movies/yeu-tinh-poster.jpg'
    ];

    for (const url of urls) {
        const status = await checkUrl(url);
        console.log(`${url}: ${status}`);
    }
}

main();
