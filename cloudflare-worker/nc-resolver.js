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

        // Thử extract hash từ URL để construct m3u8 trực tiếp (bypass embed page fetch)
        // hash trong embed.php?hash=XXX thường chính là sUb (path của m3u8)
        const hash = parsed.searchParams.get('hash');

        try {
            // Thử hash trực tiếp: https://embed.streamc.xyz/{hash}.m3u8
            if (hash) {
                const directUrl = `${parsed.origin}/${hash}.m3u8`;
                const testRes = await fetch(directUrl, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Referer': 'https://phim.nguonc.com/',
                    },
                });
                if (testRes.ok || testRes.status === 200) {
                    const result = { m3u8Url: directUrl };
                    ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
                        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
                    })));
                    return jsonResponse(result, 200, origin);
                }
            }

            // Fallback: fetch embed page để lấy data-obf (sẽ bị 403 nếu IP bị chặn)
            const response = await fetch(embedUrl, {
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Referer': 'https://phim.nguonc.com/',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                    'Upgrade-Insecure-Requests': '1',
                },
            });

            if (!response.ok) {
                return jsonResponse({ error: `Embed page returned ${response.status}`, status: response.status }, 502, origin);
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
