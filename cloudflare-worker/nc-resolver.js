/**
 * Cloudflare Worker: NC Embed Resolver
 *
 * Fetch trang embed streamc.xyz và giải mã URL m3u8 thật.
 * Chạy trên Cloudflare edge (hàng ngàn IP phân tán) → tránh bị rate-limit.
 *
 * Cách deploy:
 *   1. Vào https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Đặt tên (ví dụ: nc-resolver) → Deploy
 *   3. Vào Edit → dán toàn bộ code này → Save & Deploy
 *   4. Copy URL worker (dạng https://nc-resolver.TEN-BAN.workers.dev)
 *   5. Vào Railway → Variables → thêm: CF_WORKER_URL=https://nc-resolver.TEN-BAN.workers.dev
 */

const CORS_ORIGINS = [
    'https://pchill.online',
    'https://film-xt3.pages.dev',
    'http://localhost:3000',
    'http://localhost:5000',
];

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '';

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: buildCorsHeaders(origin) });
        }

        if (request.method !== 'GET') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        const url = new URL(request.url);
        const embedUrl = url.searchParams.get('embed');

        if (!embedUrl) {
            return jsonResponse({ error: 'Missing embed parameter' }, 400, origin);
        }

        let parsed;
        try {
            parsed = new URL(embedUrl);
        } catch {
            return jsonResponse({ error: 'Invalid embed URL' }, 400, origin);
        }

        if (!parsed.hostname.endsWith('streamc.xyz')) {
            return jsonResponse({ error: 'Only streamc.xyz embeds are supported' }, 403, origin);
        }

        // Cloudflare Cache API: cache kết quả 30 phút tại edge
        const cache = caches.default;
        const cacheKey = new Request(`https://cache.internal/nc-resolver?embed=${encodeURIComponent(embedUrl)}`, { method: 'GET' });
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) {
            const data = await cachedRes.json();
            return jsonResponse(data, 200, origin);
        }

        try {
            const response = await fetch(embedUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
                    'Referer': 'https://phim.nguonc.com/',
                    'Accept': 'text/html,*/*',
                },
            });

            if (!response.ok) {
                return jsonResponse({ error: `Embed page returned ${response.status}` }, 502, origin);
            }

            const html = await response.text();
            const obfMatch = html.match(/data-obf="([^"]+)"/);
            if (!obfMatch) {
                return jsonResponse({ error: 'Could not find data-obf in embed page' }, 502, origin);
            }

            // Giải mã double base64: data-obf → JSON → sUb → prefix của m3u8
            const outerDecoded = JSON.parse(atob(obfMatch[1]));
            const sUb = outerDecoded.sUb;
            if (!sUb) {
                return jsonResponse({ error: 'Could not extract sUb from embed' }, 502, origin);
            }

            const m3u8Url = `${parsed.origin}/${sUb}.m3u8`;
            const result = { m3u8Url };

            // Lưu vào Cloudflare edge cache 30 phút
            ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
            })));

            return jsonResponse(result, 200, origin);
        } catch (err) {
            return jsonResponse({ error: 'Failed to resolve embed', detail: err.message }, 502, origin);
        }
    },
};

function buildCorsHeaders(origin) {
    const allowed = CORS_ORIGINS.includes(origin) ? origin : '*';
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function jsonResponse(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...buildCorsHeaders(origin),
        },
    });
}
