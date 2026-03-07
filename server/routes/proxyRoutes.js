const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URL } = require('url');

// Always set CORS headers for all proxy responses (including errors)
router.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// Whitelist of allowed upstream domains for proxy (SSRF prevention)
const ALLOWED_HOSTS = [
    'phimmoi.net',      // covers hk.phimmoi.net, sing.phimmoi.net, etc.
    'streamc.xyz',      // NC embed player domain
    'hihihoho3.top',   // streamc.xyz CDN for video segments
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
            timeout: 15000,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://phim.nguonc.com/',
                'Origin': 'https://phim.nguonc.com',
                'Accept': '*/*',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            }
        });

        const content = upstream.data;
        const proxySegBase = `${req.protocol}://${req.get('host')}/api/proxy/segment`;
        const rewritten = rewriteM3u8(content, targetUrl, proxySegBase);

        res.set('Content-Type', 'application/vnd.apple.mpegurl');
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
            timeout: 25000,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://phim.nguonc.com/',
                'Origin': 'https://phim.nguonc.com',
                'Accept': '*/*',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            }
        });

        const contentType = upstream.headers['content-type'] || 'video/MP2T';
        res.set('Content-Type', contentType);
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

// In-memory cache for resolved NC embed URLs (avoids 429 rate limiting from streamc.xyz)
const resolveCache = new Map(); // embed URL → { m3u8, expiry }
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/proxy/resolve-nc?embed=<encoded_embed_url>
 * Resolves a streamc.xyz embed URL to a real HLS m3u8 URL (bypassing dead phimmoi CDN)
 */
router.get('/resolve-nc', async (req, res) => {
    // Belt-and-suspenders CORS: ensure headers are present even on error responses
    // (Railway/Render proxy may return its own 502 without passing through cors() middleware)
    const reqOrigin = req.get('origin');
    const corsAllowed = ['https://pchill.online', 'https://film-xt3.pages.dev', 'http://localhost:3000'];
    if (reqOrigin && corsAllowed.includes(reqOrigin)) {
        res.header('Access-Control-Allow-Origin', reqOrigin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }

    const embedUrl = req.query.embed;
    if (!embedUrl) return res.status(400).json({ error: 'Missing embed parameter' });

    // Only allow streamc.xyz embed URLs
    let parsed;
    try {
        parsed = new URL(embedUrl);
    } catch {
        return res.status(400).json({ error: 'Invalid embed URL' });
    }
    if (!parsed.hostname.endsWith('streamc.xyz')) {
        return res.status(403).json({ error: 'Only streamc.xyz embeds are supported' });
    }

    // Return cached result if still fresh
    const cached = resolveCache.get(embedUrl);
    if (cached && cached.expiry > Date.now()) {
        return res.json({ m3u8: cached.m3u8, directM3u8: cached.directM3u8 });
    }

    try {
        let m3u8Url;

        if (process.env.CF_WORKER_URL) {
            // Ưu tiên dùng Cloudflare Worker (IP phân tán, tránh rate-limit)
            const workerRes = await axios.get(
                `${process.env.CF_WORKER_URL}?embed=${encodeURIComponent(embedUrl)}`,
                { timeout: 10000 }
            );
            m3u8Url = workerRes.data.m3u8Url;
            if (!m3u8Url) return res.status(502).json({ error: 'Worker did not return m3u8Url' });
        } else {
            // Fallback: fetch trực tiếp từ server (có thể bị rate-limit)
            const html = await axios.get(embedUrl, {
                timeout: 7000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
                    'Referer': 'https://phim.nguonc.com/',
                    'Accept': 'text/html,*/*',
                }
            });
            const obfMatch = html.data.match(/data-obf="([^"]+)"/);
            if (!obfMatch) return res.status(502).json({ error: 'Could not find stream data in embed page' });

            const outerDecoded = JSON.parse(Buffer.from(obfMatch[1], 'base64').toString('utf8'));
            const sUb = outerDecoded.sUb;
            if (!sUb) return res.status(502).json({ error: 'Could not extract stream URL from embed' });

            m3u8Url = `${parsed.origin}/${sUb}.m3u8`;
        }

        // Optionally proxy through our server (adds CORS headers)
        const proxyM3u8 = `${req.protocol}://${req.get('host')}/api/proxy/m3u8?url=${encodeURIComponent(m3u8Url)}`;
        // Cache the result to avoid 429 rate-limiting on repeated calls
        resolveCache.set(embedUrl, { m3u8: proxyM3u8, directM3u8: m3u8Url, expiry: Date.now() + CACHE_TTL_MS });

        res.json({ m3u8: proxyM3u8, directM3u8: m3u8Url });
    } catch (err) {
        res.status(502).json({ error: 'Failed to resolve embed URL', detail: err.message });
    }
});

module.exports = router;
