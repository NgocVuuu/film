const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URL } = require('url');

// Whitelist of allowed upstream domains for proxy (SSRF prevention)
const ALLOWED_HOSTS = [
    'sing.phimmoi.net',
    'phimmoi.net',
    'streamc.xyz',
    'phim.nguonc.com',
    'nguonc.com',
];

function isAllowedUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        // Only allow http/https
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        // Check host against whitelist (exact match or subdomain)
        return ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
    } catch {
        return false;
    }
}

// Rewrite m3u8 playlist: replace segment URLs with proxied versions
function rewriteM3u8(content, baseUrl, proxyBase) {
    const lines = content.split('\n');
    return lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        // It's a segment URL
        let segUrl = trimmed;
        if (!segUrl.startsWith('http')) {
            // Relative URL - resolve against base
            try {
                segUrl = new URL(segUrl, baseUrl).href;
            } catch {
                return line;
            }
        }

        if (isAllowedUrl(segUrl)) {
            return `${proxyBase}?url=${encodeURIComponent(segUrl)}`;
        }
        return line;
    }).join('\n');
}

/**
 * GET /api/proxy/m3u8?url=<encoded_m3u8_url>
 * Proxies an HLS m3u8 playlist, rewriting segment URLs to go through /api/proxy/segment
 */
router.get('/m3u8', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
    if (!isAllowedUrl(targetUrl)) return res.status(403).json({ error: 'Domain not allowed' });

    try {
        const upstream = await axios.get(targetUrl, {
            timeout: 10000,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://phim.nguonc.com/',
            }
        });

        const content = upstream.data;
        const proxySegBase = `${req.protocol}://${req.get('host')}/api/proxy/segment`;
        const rewritten = rewriteM3u8(content, targetUrl, proxySegBase);

        res.set('Content-Type', 'application/vnd.apple.mpegurl');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'no-cache');
        res.send(rewritten);
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch upstream m3u8', detail: err.message });
    }
});

/**
 * GET /api/proxy/segment?url=<encoded_ts_or_m3u8_url>
 * Proxies a single HLS segment (ts file) or sub-playlist
 */
router.get('/segment', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
    if (!isAllowedUrl(targetUrl)) return res.status(403).json({ error: 'Domain not allowed' });

    try {
        const upstream = await axios.get(targetUrl, {
            timeout: 20000,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://phim.nguonc.com/',
            }
        });

        const contentType = upstream.headers['content-type'] || 'video/MP2T';
        res.set('Content-Type', contentType);
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'public, max-age=3600');

        // If it's a sub-playlist (.m3u8), rewrite it too
        if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
            let body = '';
            upstream.data.on('data', chunk => body += chunk.toString());
            upstream.data.on('end', () => {
                const proxySegBase = `${req.protocol}://${req.get('host')}/api/proxy/segment`;
                const rewritten = rewriteM3u8(body, targetUrl, proxySegBase);
                res.set('Content-Type', 'application/vnd.apple.mpegurl');
                res.send(rewritten);
            });
        } else {
            upstream.data.pipe(res);
        }
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch segment', detail: err.message });
    }
});

module.exports = router;
