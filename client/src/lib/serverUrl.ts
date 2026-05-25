/**
 * Server URL Obfuscation Utility
 * Maps real internal server_names to short opaque IDs used in browser URLs.
 * This prevents exposing internal hosting details (PChill - Play4Me, etc.)
 */

const SERVER_URL_MAP: Record<string, string> = {
    // KKPhim servers
    'KK - Vietsub':           's1v',
    'KK - Thuyết Minh':       's1t',
    'KK - Lồng Tiếng':        's1l',
    // OPhim servers
    'OP - Vietsub':           's2v',
    'OP - Thuyết Minh':       's2t',
    'OP - Lồng Tiếng':        's2l',
    // PChill VIP servers
    'PChill - Play4Me':       'v1',
    'PChill - Abyss':  'v2',
    // Legacy (keep for backwards compat)
    'PChill Server':          'v0',
};

// Reverse map: short ID -> real server_name
const SERVER_URL_DECODE: Record<string, string> = Object.fromEntries(
    Object.entries(SERVER_URL_MAP).map(([k, v]) => [v, k])
);

/**
 * Encode a real server name into a short URL-safe ID
 * Unknown servers fall back to base64
 */
export function encodeServerForUrl(serverName: string): string {
    if (!serverName) return '';
    return SERVER_URL_MAP[serverName] ?? btoa(unescape(encodeURIComponent(serverName))).replace(/=/g, '');
}

/**
 * Decode a URL ID back to a real server name
 * Handles: short IDs, legacy raw names (backward compat), and base64 fallback
 */
export function decodeServerFromUrl(id: string): string {
    if (!id) return '';
    // 1. Known short ID
    if (SERVER_URL_DECODE[id]) return SERVER_URL_DECODE[id];
    // 2. Legacy: old URLs still have raw server name (e.g. "KK%20-%20Vietsub")
    if (id.includes(' ') || id.includes('-')) return id;
    // 3. Base64 fallback
    try {
        const pad = id + '=='.slice((id.length % 4) || 4);
        return decodeURIComponent(escape(atob(pad)));
    } catch {
        return id;
    }
}
