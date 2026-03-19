/**
 * hashController.js - Admin endpoints để quản lý torrent hash cho phim
 */

const Movie = require('../models/Movie');
const { huntHashesForMovie, refreshRDStatus, lookupByTitle, buildMagnet } = require('../utils/hashLookup');
const realDebrid = require('../utils/realDebrid');

// Lấy API key đầu tiên còn sống để dùng cho admin operations
function getAdminApiKey() {
    const keyResult = realDebrid.getKeyForProxy(0);
    return keyResult?.key || null;
}

/**
 * GET /api/admin/hashes/:slug
 * Xem danh sách torrent hash của 1 phim
 */
exports.getMovieHashes = async (req, res) => {
    try {
        const movie = await Movie.findOne({ slug: req.params.slug })
            .select('name origin_name year torrents slug');

        if (!movie) return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });

        res.json({
            success: true,
            movie: { name: movie.name, slug: movie.slug, year: movie.year },
            torrents: movie.torrents || []
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/admin/hashes/:slug/hunt
 * Trigger tự động tìm hash từ Zilean cho 1 phim
 */
exports.huntHashes = async (req, res) => {
    try {
        const apiKey = getAdminApiKey();
        const result = await huntHashesForMovie(req.params.slug, apiKey);

        res.json({
            success: true,
            message: `Đã tìm thấy ${result.found} hash, thêm mới ${result.added} hash`,
            ...result
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/admin/hashes/:slug/manual
 * Thêm hash thủ công
 * Body: { hash, quality, size }
 */
exports.addManualHash = async (req, res) => {
    try {
        const { hash, quality = '1080p', size = null } = req.body;

        if (!hash || hash.length < 40) {
            return res.status(400).json({ success: false, message: 'Hash phải là SHA1 40 ký tự hex' });
        }

        const movie = await Movie.findOne({ slug: req.params.slug });
        if (!movie) return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });

        // Check duplicate
        const exists = movie.torrents.find(t => t.hash?.toLowerCase() === hash.toLowerCase());
        if (exists) return res.status(409).json({ success: false, message: 'Hash này đã tồn tại' });

        // Check RD availability
        const apiKey = getAdminApiKey();
        let rdCached = null;
        if (apiKey) {
            rdCached = await realDebrid.checkInstantAvailability(apiKey, hash);
        }

        movie.torrents.push({
            hash: hash.toLowerCase(),
            magnet: buildMagnet(hash),
            quality,
            size,
            source: 'manual',
            rdCached,
            rdCheckedAt: apiKey ? new Date() : null,
            isPremiumOnly: true,
        });

        await movie.save();

        res.json({
            success: true,
            message: `Đã thêm hash. RD cache status: ${rdCached === null ? 'chưa check' : rdCached ? '✅ Đã cached' : '❌ Chưa cached'}`,
            rdCached
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/admin/hashes/:slug/:hash
 * Xóa 1 hash khỏi phim
 */
exports.deleteHash = async (req, res) => {
    try {
        const movie = await Movie.findOne({ slug: req.params.slug });
        if (!movie) return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });

        const before = movie.torrents.length;
        movie.torrents = movie.torrents.filter(t => t.hash !== req.params.hash);

        if (movie.torrents.length === before) {
            return res.status(404).json({ success: false, message: 'Hash không tồn tại trong phim này' });
        }

        await movie.save();
        res.json({ success: true, message: 'Đã xóa hash' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/admin/hashes/:slug/refresh
 * Refresh trạng thái RD cache cho tất cả hash của 1 phim
 */
exports.refreshStatus = async (req, res) => {
    try {
        const apiKey = getAdminApiKey();

        if (!apiKey) {
            return res.status(503).json({ success: false, message: 'Chưa cấu hình REAL_DEBRID_API_KEY' });
        }

        await refreshRDStatus(req.params.slug, apiKey);
        const movie = await Movie.findOne({ slug: req.params.slug }).select('torrents name');

        const cached = movie.torrents.filter(t => t.rdCached === true).length;
        const notCached = movie.torrents.filter(t => t.rdCached === false).length;

        res.json({
            success: true,
            message: `Đã refresh: ${cached} cached, ${notCached} chưa cached`,
            stats: { cached, notCached, total: movie.torrents.length }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
