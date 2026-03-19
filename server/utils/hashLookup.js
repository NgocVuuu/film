/**
 * hashLookup.js - Tra cứu Torrent Hash cho phim
 * 
 * Workflow:
 * 1. Gọi Zilean API (self-hosted hoặc public) để tìm hash theo title/year
 * 2. Check instant availability trên Real-Debrid
 * 3. Lưu kết quả vào Movie.torrents[]
 */

const axios = require('axios');
const Movie = require('../models/Movie');

const ZILEAN_URL = process.env.ZILEAN_URL || 'https://zilean.elfhosted.com';
const RD_BASE_URL = 'https://api.real-debrid.com/rest/1.0';

// ----------------------------------------------------------------
// Zilean API - Tìm torrent hash theo tên phim
// ----------------------------------------------------------------

/**
 * Tìm hash từ Zilean theo title + year
 * @returns {Array} danh sách { hash, quality, size, title, year }
 */
async function lookupByTitle(title, year = null, options = {}) {
    const { limit = 5 } = options;

    try {
        // Zilean DMM Endpoint - search by title
        const params = new URLSearchParams({
            Query: title,
            ...(year && { MinYear: year, MaxYear: year }),
            Limit: limit,
        });

        const response = await axios.get(`${ZILEAN_URL}/dmm/search?${params}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'pChill/1.0' }
        });

        const results = response.data || [];

        // Map Zilean response sang format của pChill
        return results.map(item => ({
            hash: (item.InfoHash || item.infoHash || '').toLowerCase(),
            title: item.Title || item.title || title,
            year: item.Year || item.year || year,
            quality: detectQuality(item.Title || item.title || ''),
            size: item.Size || null,
            sizeBytes: item.SizeBytes || null,
            seeders: item.Seeders || null,
            source: 'zilean',
            magnet: buildMagnet(item.InfoHash || item.infoHash || ''),
        })).filter(r => r.hash.length >= 40); // Chỉ lấy hash hợp lệ (SHA1 = 40 chars)

    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.warn(`[HashLookup] Zilean không khả dụng tại ${ZILEAN_URL}. Cần tự host hoặc dùng public instance.`);
            return [];
        }
        console.error('[HashLookup] Zilean error:', error.message);
        return [];
    }
}

// ----------------------------------------------------------------
// Real-Debrid - Check Instant Availability
// ----------------------------------------------------------------

/**
 * Kiểm tra xem hash có sẵn trong cache Real-Debrid không
 * Gọi RD /torrents/instantAvailability/{hash} 
 * @param {string} apiKey - RD API key
 * @param {string} hash - SHA1 hash (40 chars)
 * @returns {boolean} true nếu cached trên RD
 */
async function checkInstantAvailability(apiKey, hash) {
    if (!apiKey || !hash) return false;

    try {
        const response = await axios.get(
            `${RD_BASE_URL}/torrents/instantAvailability/${hash}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 8000
            }
        );

        const data = response.data;
        if (!data || !data[hash.toLowerCase()]) return false;

        // RD trả về { [hash]: { rd: [[{ filename: ..., filesize: ... }]] } }
        const rdData = data[hash.toLowerCase()];
        return !!(rdData && rdData.rd && rdData.rd.length > 0);

    } catch (error) {
        // 404 = không có trong cache
        if (error.response?.status === 404) return false;
        console.error('[HashLookup] RD instant availability check error:', error.message);
        return false;
    }
}

/**
 * Bulk check availability cho nhiều hash cùng lúc
 * RD hỗ trợ truyền nhiều hash cách nhau bằng / 
 * @returns {Object} { hash: boolean }
 */
async function bulkCheckAvailability(apiKey, hashes) {
    if (!apiKey || !hashes || hashes.length === 0) return {};

    try {
        const hashList = hashes.join('/');
        const response = await axios.get(
            `${RD_BASE_URL}/torrents/instantAvailability/${hashList}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 15000
            }
        );

        const data = response.data || {};
        const result = {};

        for (const hash of hashes) {
            const h = hash.toLowerCase();
            result[h] = !!(data[h] && data[h].rd && data[h].rd.length > 0);
        }

        return result;
    } catch (error) {
        console.error('[HashLookup] Bulk availability check error:', error.message);
        return {};
    }
}

// ----------------------------------------------------------------
// Movie DB Operations
// ----------------------------------------------------------------

/**
 * Tìm và lưu hash cho 1 bộ phim, bao gồm check RD availability
 * @param {string} movieSlug 
 * @param {string} apiKey - RD API key để check cache
 */
async function huntHashesForMovie(movieSlug, apiKey = null) {
    const movie = await Movie.findOne({ slug: movieSlug }).select('name origin_name year torrents slug');
    if (!movie) throw new Error(`Không tìm thấy phim: ${movieSlug}`);

    const searchTitle = movie.origin_name || movie.name;
    const year = movie.year;

    console.log(`[HashLookup] Hunting hashes for: "${searchTitle}" (${year})`);

    // 1. Lookup từ Zilean
    const results = await lookupByTitle(searchTitle, year, { limit: 10 });

    if (results.length === 0) {
        console.log('[HashLookup] Không tìm thấy kết quả từ Zilean');
        return { found: 0, added: 0 };
    }

    // 2. Check RD Instant Availability cho tất cả hash tìm được
    let availabilityMap = {};
    if (apiKey && results.length > 0) {
        const hashes = results.map(r => r.hash);
        availabilityMap = await bulkCheckAvailability(apiKey, hashes);
        console.log(`[HashLookup] RD Cache status: ${Object.values(availabilityMap).filter(Boolean).length}/${hashes.length} cached`);
    }

    // 3. Filter: ưu tiên các hash đã có trên RD cache
    const existingHashes = new Set((movie.torrents || []).map(t => t.hash?.toLowerCase()).filter(Boolean));
    let added = 0;

    for (const result of results) {
        if (existingHashes.has(result.hash)) continue; // Skip nếu đã có

        const isCached = availabilityMap[result.hash] ?? null;

        movie.torrents.push({
            quality: result.quality,
            hash: result.hash,
            magnet: result.magnet,
            size: result.size ? formatSize(result.size) : null,
            sizeBytes: result.sizeBytes || null,
            source: 'zilean',
            rdCached: isCached,
            rdCheckedAt: apiKey ? new Date() : null,
            seeders: result.seeders,
            isPremiumOnly: true,
        });

        existingHashes.add(result.hash);
        added++;
    }

    if (added > 0) {
        await movie.save();
        console.log(`[HashLookup] Đã thêm ${added} hash cho "${movie.name}"`);
    }

    return { found: results.length, added };
}

/**
 * Cập nhật trạng thái rdCached cho tất cả torrents của 1 phim
 */
async function refreshRDStatus(movieSlug, apiKey) {
    const movie = await Movie.findOne({ slug: movieSlug }).select('torrents name');
    if (!movie || !movie.torrents.length) return;

    const hashes = movie.torrents.map(t => t.hash).filter(Boolean);
    if (hashes.length === 0) return;

    const availabilityMap = await bulkCheckAvailability(apiKey, hashes);

    for (const torrent of movie.torrents) {
        if (torrent.hash && availabilityMap.hasOwnProperty(torrent.hash.toLowerCase())) {
            torrent.rdCached = availabilityMap[torrent.hash.toLowerCase()];
            torrent.rdCheckedAt = new Date();
        }
    }

    await movie.save();
    console.log(`[HashLookup] Refreshed RD status for "${movie.name}": ${hashes.length} hashes checked`);
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildMagnet(hash) {
    if (!hash) return '';
    return `magnet:?xt=urn:btih:${hash}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce`;
}

function detectQuality(title) {
    const t = title.toUpperCase();
    if (t.includes('2160P') || t.includes('4K') || t.includes('UHD')) return '4K';
    if (t.includes('REMUX')) return 'Remux';
    if (t.includes('BLURAY') || t.includes('BLU-RAY')) return 'Bluray';
    if (t.includes('1080P')) return '1080p';
    if (t.includes('720P')) return '720p';
    return '1080p'; // Default
}

function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return null;
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
}

module.exports = {
    lookupByTitle,
    checkInstantAvailability,
    bulkCheckAvailability,
    huntHashesForMovie,
    refreshRDStatus,
    buildMagnet,
    detectQuality,
};
