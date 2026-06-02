const Movie = require('../models/Movie');
const { play4meAPI, seekstreamingAPI } = require('../utils/videoHostProviders');
const { cache } = require('../middleware/cacheMiddleware');

// Helper function to extract videoId from embed link
function extractVideoId(embedLink) {
    if (!embedLink) return null;
    try {
        const url = new URL(embedLink);
        const parts = url.pathname.split('/');
        return parts[parts.length - 1];
    } catch (e) {
        return null;
    }
}

// Get all movies (Admin - includes inactive)
exports.getAllMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const skip = (page - 1) * limit;

        const { search, type, status, isFeatured, isActive } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { origin_name: { $regex: search, $options: 'i' } }
            ];
        }
        if (type) query.type = type;
        if (status) query.status = status;
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

        // Default to showing only active movies unless explicitly requested
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        } else {
            query.isActive = { $ne: false };
        }

        // Check if errorOnly flag is requested
        if (req.query.errorOnly === 'true') {
            const allMovies = await Movie.find(query)
                .sort({ updatedAt: -1 })
                .select('name slug thumb_url type status view isFeatured isActive year episode_current episodes');

            let processedMovies = allMovies.map(doc => {
                const movie = doc.toObject();
                if (movie.type !== 'single' && movie.episodes) {
                    let maxEp = 0;
                    const match = (movie.episode_current || '').match(/\d+/);
                    if (match) maxEp = parseInt(match[0], 10);

                    const data = {
                        free: { eps: new Set(), duplicates: new Set() },
                        vip: { eps: new Set(), duplicates: new Set() }
                    };

                    movie.episodes.forEach(server => {
                        const sName = server.server_name.toLowerCase();
                        const isVip = sName.includes('play4me') || sName.includes('seekstreaming') || sName.includes('vip');
                        const target = isVip ? data.vip : data.free;
                        
                        if (server.server_data && Array.isArray(server.server_data)) {
                            server.server_data.forEach(ep => {
                                const epNumMatch = ep.name.match(/\d+/);
                                if (epNumMatch) {
                                    const epNum = parseInt(epNumMatch[0], 10);
                                    if (target.eps.has(epNum)) {
                                        target.duplicates.add(epNum);
                                    } else {
                                        target.eps.add(epNum);
                                    }
                                }
                            });
                        }
                    });

                    const buildAnalysis = (target) => {
                        const missing = [];
                        if (maxEp > 0) {
                            for (let i = 1; i <= maxEp; i++) {
                                if (!target.eps.has(i)) missing.push(i);
                            }
                        }
                        return {
                            total: target.eps.size,
                            missing: missing,
                            duplicate: Array.from(target.duplicates),
                            incomplete: maxEp > 0 && target.eps.size < maxEp
                        };
                    };

                    movie.diagnostics = {
                        free: buildAnalysis(data.free),
                        vip: buildAnalysis(data.vip)
                    };
                }
                delete movie.episodes;
                return movie;
            });

            // Filter only errored movies
            processedMovies = processedMovies.filter(m => {
                if (!m.diagnostics) return false;
                const d = m.diagnostics;
                return d.free.missing.length > 0 || d.free.duplicate.length > 0 ||
                       d.vip.missing.length > 0 || d.vip.duplicate.length > 0;
            });

            const total = processedMovies.length;
            const paginated = processedMovies.slice(skip, skip + limit);

            return res.json({
                success: true,
                data: paginated,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }

        const movies = await Movie.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('name slug thumb_url type status view isFeatured isActive year episode_current episodes');

        const total = await Movie.countDocuments(query);

        const processedMovies = movies.map(doc => {
            const movie = doc.toObject();
            if (movie.type !== 'single' && movie.episodes) {
                let maxEp = 0;
                const match = (movie.episode_current || '').match(/\d+/);
                if (match) maxEp = parseInt(match[0], 10);

                const data = {
                    free: { eps: new Set(), duplicates: new Set() },
                    vip: { eps: new Set(), duplicates: new Set() }
                };

                movie.episodes.forEach(server => {
                    const sName = server.server_name.toLowerCase();
                    const isVip = sName.includes('play4me') || sName.includes('seekstreaming') || sName.includes('vip');
                    const target = isVip ? data.vip : data.free;
                    
                    if (server.server_data && Array.isArray(server.server_data)) {
                        server.server_data.forEach(ep => {
                            const epNumMatch = ep.name.match(/\d+/);
                            if (epNumMatch) {
                                const epNum = parseInt(epNumMatch[0], 10);
                                if (target.eps.has(epNum)) {
                                    target.duplicates.add(epNum);
                                } else {
                                    target.eps.add(epNum);
                                }
                            }
                        });
                    }
                });

                const buildAnalysis = (target) => {
                    const missing = [];
                    if (maxEp > 0) {
                        for (let i = 1; i <= maxEp; i++) {
                            if (!target.eps.has(i)) missing.push(i);
                        }
                    }
                    return {
                        total: target.eps.size,
                        missing: missing,
                        duplicate: Array.from(target.duplicates),
                        incomplete: maxEp > 0 && target.eps.size < maxEp
                    };
                };

                movie.diagnostics = {
                    free: buildAnalysis(data.free),
                    vip: buildAnalysis(data.vip)
                };
            }
            delete movie.episodes; // Remove heavy array before sending
            return movie;
        });

        res.json({
            success: true,
            data: processedMovies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all movies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single movie detail (Admin)
exports.getMovieDetail = async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        res.json({ success: true, data: movie });
    } catch (error) {
        console.error('Get movie detail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update movie info (Full update)
exports.updateMovie = async (req, res) => {
    try {
        const { slug } = req.params;
        const updates = req.body;

        // Allowed fields to update
        const allowedFields = [
            'name', 'origin_name', 'content', 'thumb_url', 'poster_url', 'trailer_url',
            'year', 'quality', 'lang', 'status', 'type', 'time', 'episode_current',
            'episode_total', 'notify', 'showtimes', 'is_copyright', 'sub_docquyen',
            'chieurap', 'actor', 'director', 'category', 'country', 'episodes', 'mkvUrl'
        ];
        const filteredUpdates = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        const movie = await Movie.findOne({ slug });
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        // Check for deleted episodes to remove from VIP host
        if (filteredUpdates.episodes && movie.episodes) {
            movie.episodes.forEach(oldServer => {
                const api = oldServer.server_name === 'PChill - Play4Me' ? play4meAPI : 
                            oldServer.server_name === 'PChill - Seekstreaming (VIP 1)' ? seekstreamingAPI : null;
                if (api) {
                    const newServer = filteredUpdates.episodes.find(s => s.server_name === oldServer.server_name);
                    const newEpSlugs = newServer ? newServer.server_data.map(e => e.slug) : [];
                    
                    oldServer.server_data.forEach(oldEp => {
                        if (!newEpSlugs.includes(oldEp.slug)) {
                            // Episode was deleted
                            const videoId = extractVideoId(oldEp.link_embed);
                            if (videoId) {
                                api.deleteVideo(videoId).catch(err => console.error('Delete VIP video error:', err));
                            }
                        }
                    });
                }
            });
        }

        const updatedMovie = await Movie.findOneAndUpdate(
            { slug },
            { ...filteredUpdates, updatedAt: Date.now() },
            { new: true }
        );

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        // Clear related cache keys to reflect changes immediately
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.includes(`/api/movie/${slug}`) || key.includes(`/api/movies`)) {
                cache.del(key);
            }
        });

        res.json({ success: true, message: 'Đã cập nhật thông tin phim', data: updatedMovie });
    } catch (error) {
        console.error('Update movie error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle movie active status (soft delete/restore)
exports.toggleActive = async (req, res) => {
    try {
        const { slug } = req.params;
        const { isActive } = req.body;

        const movie = await Movie.findOneAndUpdate(
            { slug },
            { isActive: isActive !== undefined ? isActive : false },
            { new: true }
        );

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        // Clear cache
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.includes(`/api/movie/${slug}`) || key.includes(`/api/movies`)) {
                cache.del(key);
            }
        });

        res.json({
            success: true,
            message: movie.isActive ? 'Đã hiện phim' : 'Đã ẩn phim',
            data: movie
        });
    } catch (error) {
        console.error('Toggle active error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete movie (Two-step: soft delete then hard delete)
exports.deleteMovie = async (req, res) => {
    try {
        const { slug } = req.params;

        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        // If movie is already inactive, perform hard delete
        if (!movie.isActive) {
            // Xóa tất cả file trên VIP host
            if (movie.episodes) {
                movie.episodes.forEach(serverObj => {
                    const api = serverObj.server_name === 'PChill - Play4Me' ? play4meAPI : 
                                serverObj.server_name === 'PChill - Seekstreaming (VIP 1)' ? seekstreamingAPI : null;
                    if (api) {
                        serverObj.server_data.forEach(ep => {
                            const videoId = extractVideoId(ep.link_embed);
                            if (videoId) {
                                api.deleteVideo(videoId).catch(err => console.error('Delete VIP video error:', err));
                            }
                        });
                    }
                });
            }

            await Movie.deleteOne({ slug });
            return res.json({ success: true, message: 'Đã xóa phim vĩnh viễn khỏi hệ thống' });
        }

        // Otherwise perform soft delete (hide)
        movie.isActive = false;
        await movie.save();

        // Clear cache
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.includes(`/api/movie/${slug}`) || key.includes(`/api/movies`)) {
                cache.del(key);
            }
        });

        res.json({ success: true, message: 'Đã ẩn phim (chuyển vào mục Đã ẩn)' });
    } catch (error) {
        console.error('Delete movie error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle featured flag
exports.toggleFeatured = async (req, res) => {
    try {
        const { slug } = req.params;

        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        movie.isFeatured = !movie.isFeatured;
        await movie.save();

        res.json({
            success: true,
            message: movie.isFeatured ? 'Đã đánh dấu nổi bật' : 'Đã bỏ đánh dấu nổi bật',
            data: movie
        });
    } catch (error) {
        console.error('Toggle featured error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sync TMDB cho 1 phim
exports.syncTmdb = async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await Movie.findOne({ slug });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        }

        const { syncMovieCast, mergeActors } = require('../utils/tmdb');
        const tmdbData = await syncMovieCast(movie.name, movie.origin_name, movie.type, movie.year);

        if (!tmdbData) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin trên TMDB' });
        }

        // Ưu tiên dùng tên thuần Việt có sẵn từ crawler
        const mergedCast = mergeActors(movie.actor, tmdbData.cast);

        movie.tmdb_id = tmdbData.tmdb_id;
        movie.tmdb_type = tmdbData.tmdb_type;
        movie.cast = mergedCast;
        await movie.save();

        // Clear cache so frontend sees the update immediately
        const { cache } = require('../middleware/cacheMiddleware');
        const keys = cache.keys();
        keys.forEach(k => {
            if (k.startsWith(`/api/movie/${slug}`)) {
                cache.del(k);
            }
        });

        res.json({
            success: true,
            message: 'Đã đồng bộ thông tin diễn viên thành công',
            data: movie
        });
    } catch (error) {
        console.error('Sync TMDB error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

let syncStatus = { isRunning: false, total: 0, current: 0, currentSlug: '' };

exports.syncAllTmdb = async (req, res) => {
    try {
        if (syncStatus.isRunning) {
            return res.json({ success: false, message: 'Đang có tiến trình đồng bộ chạy ngầm rồi.' });
        }

        // Tìm các phim chưa có dữ liệu cast
        const moviesToSync = await Movie.find({
            $or: [
                { tmdb_id: { $exists: false } },
                { tmdb_id: null },
                { cast: { $exists: false } },
                { cast: { $size: 0 } }
            ]
        }).select('slug name origin_name type year actor');

        if (moviesToSync.length === 0) {
            return res.json({ success: true, message: 'Tất cả phim đã được đồng bộ TMDB.' });
        }

        syncStatus = { isRunning: true, total: moviesToSync.length, current: 0, currentSlug: '' };
        res.json({ success: true, message: `Bắt đầu đồng bộ ${moviesToSync.length} phim.` });

        // Chạy ngầm
        (async () => {
            const { syncMovieCast, mergeActors } = require('../utils/tmdb');
            for (const movie of moviesToSync) {
                syncStatus.current++;
                syncStatus.currentSlug = movie.slug;
                try {
                    const tmdbData = await syncMovieCast(movie.name, movie.origin_name, movie.type, movie.year);
                    if (tmdbData) {
                        const mergedCast = mergeActors(movie.actor, tmdbData.cast);
                        await Movie.updateOne({ slug: movie.slug }, {
                            $set: {
                                tmdb_id: tmdbData.tmdb_id,
                                tmdb_type: tmdbData.tmdb_type,
                                cast: mergedCast
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Sync TMDB failed for ${movie.slug}:`, err.message);
                }
                // Dừng 300ms tránh rate limit TMDB
                await new Promise(r => setTimeout(r, 300));
            }
            syncStatus.isRunning = false;
            
            // Xóa cache khi xong
            const { cache } = require('../middleware/cacheMiddleware');
            cache.flushAll(); 
        })();
    } catch (error) {
        console.error('Sync All TMDB error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSyncAllStatus = (req, res) => {
    res.json({ success: true, data: syncStatus });
};
