import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint để fetch VAST XML từ Hilltop/Difficultblock
 * Giải quyết CORS khi browser không được phép fetch trực tiếp
 * Usage: GET /api/vast?url=<encoded VAST URL>
 */
export const runtime = 'edge';

// Chỉ cho phép fetch từ domain Hilltop
const ALLOWED_HOSTS = ['difficultblock.com', 'hilltopads.com', 'hilltopads.net'];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const vastUrl = searchParams.get('url');

    if (!vastUrl) {
        return new NextResponse('Missing url param', { status: 400 });
    }

    // Validate host để tránh SSRF
    let parsed: URL;
    try {
        parsed = new URL(vastUrl);
    } catch {
        return new NextResponse('Invalid URL', { status: 400 });
    }

    const hostname = parsed.hostname.replace(/^www\./, '');
    if (!ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
        return new NextResponse('Host not allowed', { status: 403 });
    }

    try {
        const res = await fetch(vastUrl, {
            headers: {
                'Accept': 'application/xml, text/xml, */*',
                'User-Agent': 'Mozilla/5.0 (compatible; VAST-Client/1.0)',
            },
            // Edge runtime: không cache để luôn lấy ad mới
            cache: 'no-store',
        });

        const xml = await res.text();

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err) {
        console.error('[VAST proxy] fetch error:', err);
        return new NextResponse('VAST fetch failed', { status: 502 });
    }
}
