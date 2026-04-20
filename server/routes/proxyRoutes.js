const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('Missing url param');
    
    try {
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': new URL(imageUrl).origin
            }
        });
        
        res.set('Content-Type', response.headers['content-type']);
        res.set('Cache-Control', 'public, max-age=86400');
        response.data.pipe(res);
    } catch (e) {
        console.error('Image proxy error:', e.message);
        res.status(500).send('Failed to proxy image');
    }
});

module.exports = router;
