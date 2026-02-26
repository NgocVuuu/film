export default {
    async fetch(request, env, ctx) {
        // 1. Resolve CORS for browsers seeking to preflight the stream request
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Accept, Origin, Content-Type',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new Response('Missing target "url" parameter', { status: 400 });
        }

        // 2. Prepare headers to forward to Real-Debrid
        const headers = new Headers();
        const range = request.headers.get('Range');
        if (range) {
            headers.set('Range', range);
        }

        // It is critical to maintain user-agent behavior if Real-Debrid enforces it
        const userAgent = request.headers.get('User-Agent');
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }

        try {
            // 3. Fetch the stream from Real-Debrid
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: headers,
            });

            // 4. Return the response to the user, stripping/replacing Headers to allow CORS
            const responseHeaders = new Headers(response.headers);
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            // Remove headers that might cause problems with streaming in some clients
            responseHeaders.delete('Report-To');
            responseHeaders.delete('NEL');

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
            });
        } catch (err) {
            return new Response('Proxy Error: ' + err.message, { status: 500 });
        }
    },
};
