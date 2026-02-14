const Movie = require('../models/Movie');
const mongoose = require('mongoose');
const axios = require('axios');
const NodeCache = require('node-cache');
const searchCache = new NodeCache({ stdTTL: 1200 }); // 20 minutes search cache

const { attachProgressToMovies } = require('../utils/movieUtils');
// Delay import to avoid circular dependency if any, but since we only need syncSpecificMovie
// it might be safer to define a simple helper or use it directly
const { syncSpecificMovie } = require('../crawler');

const multiSourceSearch = async (keyword) => {
    const cacheKey = `search_${keyword}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    // Parallel search across 3 sources
    const results = await Promise.allSettled([
        axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, { timeout: 5000 }),
        axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, { timeout: 5000 }),
        axios.get(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}`, { timeout: 5000 })
    ]);

    const allMovies = new Map(); // Use Map to merge by slug

    // 1. Process KKPhim (Priority 1)
    if (results[1].status === 'fulfilled' && results[1].value.data.status === 'success') {
        const items = results[1].value.data.data.items || [];
        items.forEach(m => {
            allMovies.set(m.slug, {
                _id: m._id,
                name: m.name,
                slug: m.slug,
                origin_name: m.origin_name,
                thumb_url: m.thumb_url,
                poster_url: m.poster_url,
                year: m.year,
                type: m.type,
                quality: m.quality,
                episode_current: m.episode_current,
                fromExternal: true,
                source: 'KKPhim'
            });
        });
    }

    // 2. Process NguonC (Priority 2)
    if (results[2].status === 'fulfilled' && results[2].value.data.status === 'success') {
        const items = results[2].value.data.items || [];
        items.forEach(m => {
            if (!allMovies.has(m.slug)) {
                allMovies.set(m.slug, {
                    name: m.name,
                    slug: m.slug,
                    origin_name: m.original_name,
                    thumb_url: m.thumb_url,
                    poster_url: m.poster_url,
                    year: m.year,
                    type: m.type,
                    quality: m.quality,
                    episode_current: m.episode_current,
                    fromExternal: true,
                    source: 'NguonC'
                });
            }
        });
    }

    // 3. Process Ophim (Priority 3)
    if (results[0].status === 'fulfilled' && (results[0].value.data.status === 'success' || results[0].value.data.status === true)) {
        const items = results[0].value.data.data.items || [];
        items.forEach(m => {
            if (!allMovies.has(m.slug)) {
                allMovies.set(m.slug, {
                    _id: m._id,
                    name: m.name,
                    slug: m.slug,
                    origin_name: m.origin_name,
                    thumb_url: m.thumb_url,
                    poster_url: m.poster_url,
                    year: m.year,
                    type: m.type,
                    quality: m.quality,
                    episode_current: m.episode_current,
                    fromExternal: true,
                    source: 'Ophim'
                });
            }
        });
    }

    const finalResults = Array.from(allMovies.values()).map(m => ({
        ...m,
        thumb_url: m.thumb_url || '',
        poster_url: m.poster_url || ''
    }));
    searchCache.set(cacheKey, finalResults);
    return finalResults;
};

// 1. Get Home Data (Aggregated)
const getHomeData = async (req, res) => {
    try {
        const [
            trendingMovies,
            featuredMovies,
            latestMovies,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            thailandMovies,
            japanMovies,
            actionMovies,
            romanceMovies,
            comedyMovies,
            adventureMovies,
            scifiMovies,
            crimeMovies,
            historyDramaMovies,
            martialArtsMovies,
            shortDramaMovies,
            tvShows,
            warMovies,
            mysteryMovies,
            schoolMovies,
            documentaryMovies,
            fantasyMovies,
            hkMovies,
            vnMovies
        ] = await Promise.all([
            // 1. Trending
            Movie.find({}).sort({ view: -1 }).limit(10).select('-content -episodes -director -actor'),
            // 2. Featured (Cinema)
            Movie.find({ chieurap: true }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 3. Latest
            Movie.find({}).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 4. China
            Movie.find({ 'country.slug': 'trung-quoc' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 5. Korea
            Movie.find({ 'country.slug': 'han-quoc' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 6. US/UK (Hollywood)
            Movie.find({ 'country.slug': { $in: ['au-my', 'anh', 'my'] } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 7. Cartoon (type: hoathinh) - Used for Anime
            Movie.find({ type: 'hoathinh' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 8. Horror
            Movie.find({ 'category.slug': 'kinh-di' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 9. Family
            Movie.find({ 'category.slug': 'gia-dinh' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 10. Thailand
            Movie.find({ 'country.slug': 'thai-lan' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 11. Japan
            Movie.find({ 'country.slug': 'nhat-ban' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 12. Action
            Movie.find({ 'category.slug': 'hanh-dong' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 13. Romance
            Movie.find({ 'category.slug': 'tinh-cam' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 14. Comedy
            Movie.find({ 'category.slug': 'hai-huoc' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 15. Adventure
            Movie.find({ 'category.slug': 'phieu-luu' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 16. Sci-Fi
            Movie.find({ 'category.slug': 'vien-tuong' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 17. Crime
            Movie.find({ 'category.slug': 'hinh-su' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 18. Historical/Cổ Trang
            Movie.find({ 'category.slug': 'co-trang' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 19. Martial Arts
            Movie.find({ 'category.slug': 'vo-thuat' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 20. Short Drama
            Movie.find({ 'category.slug': 'short-drama' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 21. TV Show
            Movie.find({ type: 'tvshows' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 22. War
            Movie.find({ 'category.slug': 'chien-tranh' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 23. Mystery
            Movie.find({ 'category.slug': 'bi-an' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 24. School
            Movie.find({ 'category.slug': 'hoc-duong' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 25. Documentary
            Movie.find({ 'category.slug': 'tai-lieu' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 26. Fantasy
            Movie.find({ 'category.slug': 'than-thoai' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 27. Hong Kong
            Movie.find({ 'country.slug': 'hong-kong' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // 28. Viet Nam
            Movie.find({ 'country.slug': 'viet-nam' }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
        ]);

        let responseData = {
            trendingMovies,
            featuredMovies,
            latestMovies,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            thailandMovies,
            japanMovies,
            actionMovies,
            romanceMovies,
            comedyMovies,
            adventureMovies,
            scifiMovies,
            crimeMovies,
            historyDramaMovies,
            martialArtsMovies,
            shortDramaMovies,
            tvShows,
            warMovies,
            mysteryMovies,
            schoolMovies,
            documentaryMovies,
            fantasyMovies,
            hkMovies,
            vnMovies
        };

        if (req.user) {
            try {
                const userId = req.user._id;
                responseData.trendingMovies = await attachProgressToMovies(trendingMovies, userId);
                responseData.featuredMovies = await attachProgressToMovies(featuredMovies, userId);
                responseData.latestMovies = await attachProgressToMovies(latestMovies, userId);
                responseData.chinaMovies = await attachProgressToMovies(chinaMovies, userId);
                responseData.koreaMovies = await attachProgressToMovies(koreaMovies, userId);
                responseData.usukMovies = await attachProgressToMovies(usukMovies, userId);
                responseData.cartoonMovies = await attachProgressToMovies(cartoonMovies, userId);
                responseData.familyMovies = await attachProgressToMovies(familyMovies, userId);
                responseData.thailandMovies = await attachProgressToMovies(thailandMovies, userId);
                responseData.japanMovies = await attachProgressToMovies(japanMovies, userId);
                responseData.actionMovies = await attachProgressToMovies(actionMovies, userId);
                responseData.romanceMovies = await attachProgressToMovies(romanceMovies, userId);

                // Fetch Continue Watching
                const WatchProgress = require('../models/WatchProgress');
                // Use aggregation to get unique movies (most recently watched episode per movie)
                const recentProgress = await WatchProgress.aggregate([
                    {
                        $match: {
                            userId: req.user._id,
                            completed: false  // Only show incomplete episodes
                        }
                    },
                    { $sort: { lastWatched: -1 } },
                    {
                        $group: {
                            _id: "$movieSlug",
                            doc: { $first: "$$ROOT" }
                        }
                    },
                    { $replaceRoot: { newRoot: "$doc" } },
                    { $sort: { lastWatched: -1 } },
                    { $limit: 10 }
                ]);

                if (recentProgress.length > 0) {
                    const slugs = recentProgress.map(p => p.movieSlug);
                    // Fetch movies to get latest details (thumb, name, etc)
                    const movies = await Movie.find({ slug: { $in: slugs } }).select('name slug thumb_url year episode_current type poster_url');

                    // Map back to preserve order and attach progress
                    responseData.continueWatching = recentProgress.map(p => {
                        const movie = movies.find(m => m.slug === p.movieSlug);
                        if (!movie) return null;
                        const movieObj = movie.toObject();
                        movieObj.progress = {
                            currentTime: p.currentTime,
                            duration: p.duration,
                            percentage: p.duration > 0 ? Math.round((p.currentTime / p.duration) * 100) : 0,
                            episodeSlug: p.episodeSlug,
                            episodeName: p.episodeName
                        };
                        return movieObj;
                    }).filter(Boolean);
                } else {
                    responseData.continueWatching = [];
                }

            } catch (progressError) {
                console.error('Error attaching progress in getHomeData:', progressError);
                // Continue without progress if error occurs
            }
        }

        res.json({
            success: true,
            data: responseData
        });
    } catch (err) {
        console.error('Home data error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get Movies List (Pagination & Filter)
const getMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const skip = (page - 1) * limit;

        // Filters
        const { category, country, year, status, sort, type, chieurap, q, actor } = req.query;
        let query = {};

        // Text search (if 'q' is present)
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { origin_name: { $regex: q, $options: 'i' } },
                { slug: { $regex: q, $options: 'i' } }
            ];
        }

        if (category) query['category.slug'] = category;
        if (country) query['country.slug'] = country;
        if (year) query.year = parseInt(year);
        if (status) query.status = status; // 'completed' | 'ongoing'
        if (type) query.type = type; // 'series' | 'single' | 'hoathinh' | 'tvshows'
        if (chieurap === 'true') query.chieurap = true;
        if (actor) query.actor = actor; // Filter by actor name

        // Sorting
        let sortOption = { year: -1, updatedAt: -1 }; // Default: Newest Release & Latest Update
        if (sort === 'updated') sortOption = { updatedAt: -1 };
        if (sort === 'newest') sortOption = { year: -1, updatedAt: -1 }; // Release year
        if (sort === 'view') sortOption = { view: -1 };
        if (sort === 'rating') sortOption = { rating_average: -1 };

        let movies = await Movie.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .select('name slug thumb_url origin_name year type quality episode_current view rating_average');

        let total = await Movie.countDocuments(query);

        // Hybrid Search: If q is present, page is 1, and no local results found
        if (q && movies.length === 0 && page === 1) {
            try {
                const externalMovies = await multiSourceSearch(q);

                if (externalMovies.length > 0) {
                    movies = externalMovies;
                    total = externalMovies.length;

                    // Background sync (gentle queue)
                    setImmediate(async () => {
                        for (const movie of externalMovies) {
                            try {
                                await syncSpecificMovie(movie.slug);
                                // Small delay between syncs during search to be VPS friendly
                                await new Promise(r => setTimeout(r, 1000));
                            } catch (e) {
                                console.error(`[HYBRID SYNC] Failed for ${movie.slug}:`, e.message);
                            }
                        }
                    });
                }
            } catch (externalError) {
                console.error('[HYBRID] Multi-source search error:', externalError.message);
            }
        }

        // Attach progress if logged in
        let finalMovies = movies;
        if (req.user) {
            finalMovies = await attachProgressToMovies(movies, req.user._id);
        }

        res.json({
            success: true,
            data: finalMovies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get movies error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};


// 3. Get Movie Detail
const getMovieDetail = async (req, res) => {
    try {
        let movie = await Movie.findOne({ slug: req.params.slug });

        // If not found in DB, try fetching from external API (Hybrid Detail)
        if (!movie) {
            try {
                const syncResult = await syncSpecificMovie(req.params.slug);
                if (syncResult.success) {
                    movie = await Movie.findOne({ slug: req.params.slug });
                }
            } catch (error) {
                console.error('[HYBRID DETAIL] Sync error:', error.message);
            }
        }

        if (!movie) return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });

        // Get related movies (same category)
        let related = await Movie.find({
            'category.slug': { $in: movie.category.map(c => c.slug) },
            slug: { $ne: movie.slug }
        }).limit(6).select('name slug thumb_url year episode_current');

        // Attach progress if logged in
        let movieData = movie;
        if (req.user) {
            try {
                movieData = await attachProgressToMovies(movie, req.user._id);
                related = await attachProgressToMovies(related, req.user._id);
            } catch (error) {
                console.error('Error attaching progress in getMovieDetail:', error);
            }
        }

        res.json({ success: true, data: movieData, related });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getHomeData,
    getMovies,
    getMovieDetail
};
