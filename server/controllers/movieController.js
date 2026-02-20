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
        axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, { timeout: 3000 }), // Adjusted to 3s
        axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, { timeout: 3000 }), // Adjusted to 3s
        axios.get(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}`, { timeout: 3000 }) // Adjusted to 3s
    ]);

    const allMovies = new Map(); // Use Map to merge by slug

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            try {
                // Ophim (Index 0) & KKPhim (Index 1) - Similar structure
                if (index === 0 || index === 1) {
                    const data = result.value.data;
                    // Check for different response structures
                    const items = data?.data?.items || data?.items || [];

                    items.forEach(m => {
                        const sourceName = index === 0 ? 'Ophim' : 'KKPhim';
                        // Prioritize existing entries/higher priority sources if needed
                        if (!allMovies.has(m.slug)) {
                            allMovies.set(m.slug, {
                                name: m.name,
                                slug: m.slug,
                                origin_name: m.origin_name,
                                thumb_url: m.thumb_url,
                                poster_url: m.poster_url,
                                year: m.year,
                                type: m.type,
                                // KKPhim/Ophim specific fields
                                _id: m._id,
                                quality: m.quality,
                                episode_current: m.episode_current,
                                fromExternal: true,
                                source: sourceName
                            });
                        }
                    });
                }
                // NguonC (Index 2)
                else if (index === 2) {
                    const data = result.value.data;
                    const items = data?.items || [];
                    items.forEach(m => {
                        if (!allMovies.has(m.slug)) {
                            allMovies.set(m.slug, {
                                name: m.name,
                                slug: m.slug,
                                origin_name: m.original_name, // NguonC uses original_name
                                thumb_url: m.thumb_url,
                                poster_url: m.poster_url,
                                year: m.year, // Verify if NguonC provides year
                                type: m.type,
                                quality: m.quality,
                                episode_current: m.current_episode, // NguonC might use different field
                                fromExternal: true,
                                source: 'NguonC'
                            });
                        }
                    });
                }
            } catch (err) {
                console.error(`Error processing result from source ${index}:`, err.message);
            }
        } else {
            // Log failure but don't stop
            // console.warn(`Source ${index} failed:`, result.reason?.message);
        }
    });

    const finalResults = Array.from(allMovies.values()).map(m => {
        const processImg = (path, source) => {
            if (!path || path.startsWith('http')) return path || '';
            let base = '';
            if (source === 'KKPhim') base = 'https://phimimg.com';
            if (source === 'NguonC') base = 'https://phim.nguonc.com';
            if (source === 'Ophim') base = 'https://img.ophim.live/uploads/movies';

            if (!base) return path;
            return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
        };

        return {
            ...m,
            thumb_url: processImg(m.thumb_url, m.source),
            poster_url: processImg(m.poster_url, m.source)
        };
    });

    searchCache.set(cacheKey, finalResults);
    return finalResults;
};

// 1. Get Home Data (Aggregated)
const getHomeData = async (req, res) => {
    try {
        const start = Date.now();
        // 0. Trending Logic (TMDB + Local Fallback)
        const getTrendingMoviesPromise = (async () => {
            let trendingMovies = [];
            try {
                const TMDB_API_KEY = process.env.TMDB_API_KEY;
                if (TMDB_API_KEY) {
                    const cacheKey = 'tmdb_trending_day';
                    let tmdbData = searchCache.get(cacheKey);

                    if (!tmdbData) {
                        try {
                            const tmdbRes = await axios.get(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=vi`, { timeout: 3000 });
                            tmdbData = tmdbRes.data.results || [];
                            searchCache.set(cacheKey, tmdbData, 3600);
                        } catch (timeoutErr) {
                            console.error('TMDB Fetch Timeout/Error:', timeoutErr.message);
                        }
                    }

                    if (tmdbData && tmdbData.length > 0) {
                        const tmdbTitles = tmdbData.map(m => m.title || m.name).filter(Boolean);
                        const tmdbOriginalTitles = tmdbData.map(m => m.original_title || m.original_name).filter(Boolean);

                        const localMatches = await Movie.find({
                            isActive: { $ne: false },
                            $or: [
                                { name: { $in: tmdbTitles } },
                                { origin_name: { $in: tmdbOriginalTitles } }
                            ]
                        }).select('-content -episodes -director -actor').lean();

                        if (localMatches.length > 0) {
                            const orderMap = new Map();
                            tmdbData.forEach((item, index) => {
                                if (item.title) orderMap.set(item.title.toLowerCase(), index);
                                if (item.name) orderMap.set(item.name.toLowerCase(), index);
                                if (item.original_title) orderMap.set(item.original_title.toLowerCase(), index);
                                if (item.original_name) orderMap.set(item.original_name.toLowerCase(), index);
                            });

                            trendingMovies = localMatches.sort((a, b) => {
                                const indexA = orderMap.get((a.name || '').toLowerCase()) ?? orderMap.get((a.origin_name || '').toLowerCase()) ?? 100;
                                const indexB = orderMap.get((b.name || '').toLowerCase()) ?? orderMap.get((b.origin_name || '').toLowerCase()) ?? 100;
                                return indexA - indexB;
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Trending Logic Error:', err.message);
            }

            if (trendingMovies.length < 5) {
                const localTrending = await Movie.find({
                    isActive: { $ne: false },
                    updatedAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }
                }).sort({ view: -1 }).limit(10).select('-content -episodes -director -actor').lean();

                const existingIds = new Set(trendingMovies.map(m => m._id.toString()));
                const additional = localTrending.filter(m => !existingIds.has(m._id.toString()));
                trendingMovies = [...trendingMovies, ...additional].slice(0, 10);
            }
            return trendingMovies;
        })();

        // Execute all queries in parallel
        const [
            trendingMovies,
            featuredMovies,
            upcomingMovies,
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
            vnMovies,
            hotAnimeMovies,
            legendaryAnimeMovies
        ] = await Promise.all([
            getTrendingMoviesPromise,
            // 2. Featured (Cinema - Exclude Trailer only)
            Movie.find({ chieurap: true, isActive: { $ne: false }, episode_current: { $not: /trailer/i } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 2.5 Upcoming (Cinema - Only Trailer)
            Movie.find({ chieurap: true, isActive: { $ne: false }, episode_current: { $regex: /trailer/i } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 3. Latest
            Movie.find({ isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 4. China
            Movie.find({ 'country.slug': 'trung-quoc', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 5. Korea
            Movie.find({ 'country.slug': 'han-quoc', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 6. Western (Holland/USUK) - Single movies only for blockbuster feel
            Movie.find({ 'country.slug': { $in: ['au-my', 'anh', 'my'] }, type: 'single', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 7. Cartoon/Anime (Kids & Family only as per label)
            Movie.find({ type: 'hoathinh', 'category.slug': 'gia-dinh', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 8. Horror - Single movies prioritize
            Movie.find({ 'category.slug': 'kinh-di', type: 'single', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 9. Family/Kids - Live Action Only (Exclude Animation)
            Movie.find({ 'category.slug': 'gia-dinh', type: { $ne: 'hoathinh' }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 10. Thailand
            Movie.find({ 'country.slug': 'thai-lan', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 11. Japan
            Movie.find({ 'country.slug': 'nhat-ban', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 12. Action - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'hanh-dong', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 12. Romance - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'tinh-cam', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 13. Comedy - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'hai-huoc', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 14. Adventure - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'phieu-luu', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 15. Sci-Fi - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'vien-tuong', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 16. Crime - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'hinh-su', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 17. Historical/Cổ Trang (Strictly China as per plan)
            Movie.find({ 'category.slug': 'co-trang', 'country.slug': 'trung-quoc', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 18. Martial Arts - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'vo-thuat', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 19. Short Drama
            Movie.find({ 'category.slug': 'short-drama', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 20. TV Shows - Use type: 'tvshows' strictly
            Movie.find({ type: 'tvshows', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 21. War - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'chien-tranh', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 22. Mystery - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'bi-an', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 23. School - Filter by China & Exclude Animation
            Movie.find({ 'category.slug': 'hoc-duong', 'country.slug': 'trung-quoc', type: { $ne: 'hoathinh' }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 24. Documentary - Exclude Animation
            Movie.find({ 'category.slug': 'tai-lieu', type: { $ne: 'hoathinh' }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 25. Fantasy - Exclude Animation & TV Shows
            Movie.find({ 'category.slug': 'than-thoai', type: { $nin: ['hoathinh', 'tvshows'] }, isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 26. Hong Kong
            Movie.find({ 'country.slug': 'hong-kong', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 27. Vietnam
            Movie.find({ 'country.slug': 'viet-nam', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 28. Hot Anime
            Movie.find({ type: 'hoathinh', isActive: { $ne: false } }).sort({ view: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 29. Legendary Anime (Older than or equal to 2015)
            Movie.find({ type: 'hoathinh', year: { $lte: 2015 }, isActive: { $ne: false } }).sort({ view: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean()
        ]);

        let responseData = {
            trendingMovies, featuredMovies, upcomingMovies, latestMovies, chinaMovies, koreaMovies,
            usukMovies, cartoonMovies, horrorMovies, familyMovies, thailandMovies,
            japanMovies, actionMovies, romanceMovies, comedyMovies, adventureMovies,
            scifiMovies, crimeMovies, historyDramaMovies, martialArtsMovies, shortDramaMovies,
            tvShows, warMovies, mysteryMovies, schoolMovies, documentaryMovies, fantasyMovies,
            hkMovies, vnMovies, hotAnimeMovies, legendaryAnimeMovies
        };

        if (req.user) {
            try {
                const userId = req.user._id;

                // 1. Optimization: Batch fetch progress for ALL home page movies at once
                const allMovies = [
                    ...trendingMovies, ...featuredMovies, ...upcomingMovies, ...latestMovies, ...chinaMovies, ...koreaMovies,
                    ...usukMovies, ...cartoonMovies, ...horrorMovies, ...familyMovies, ...thailandMovies,
                    ...japanMovies, ...actionMovies, ...romanceMovies, ...comedyMovies, ...adventureMovies,
                    ...scifiMovies, ...crimeMovies, ...historyDramaMovies, ...martialArtsMovies, ...shortDramaMovies,
                    ...tvShows, ...warMovies, ...mysteryMovies, ...schoolMovies, ...documentaryMovies, ...fantasyMovies,
                    ...hkMovies, ...vnMovies, ...hotAnimeMovies, ...legendaryAnimeMovies
                ];

                const allSlugs = [...new Set(allMovies.map(m => m.slug))];

                const WatchProgress = require('../models/WatchProgress');
                const allProgress = await WatchProgress.find({
                    userId,
                    movieSlug: { $in: allSlugs }
                }).lean();

                const progressMap = {};
                allProgress.forEach(p => {
                    progressMap[p.movieSlug] = {
                        currentTime: p.currentTime,
                        duration: p.duration,
                        percentage: p.duration > 0 ? Math.round((p.currentTime / p.duration) * 100) : 0,
                        episodeSlug: p.episodeSlug,
                        episodeName: p.episodeName
                    };
                });

                // Attach progress to all lists in memory
                const attachLocal = (movies) => {
                    return movies.map(movie => {
                        // movie is a plain object due to .lean() in the queries
                        if (progressMap[movie.slug]) {
                            movie.progress = progressMap[movie.slug];
                        }
                        return movie;
                    });
                };

                for (const key in responseData) {
                    if (Array.isArray(responseData[key])) {
                        responseData[key] = attachLocal(responseData[key]);
                    }
                }

                // 2. Fetch Continue Watching (Recent History)
                const recentProgress = await WatchProgress.aggregate([
                    { $match: { userId: req.user._id, completed: false } },
                    { $sort: { lastWatched: -1 } },
                    { $group: { _id: "$movieSlug", doc: { $first: "$$ROOT" } } },
                    { $replaceRoot: { newRoot: "$doc" } },
                    { $sort: { lastWatched: -1 } },
                    { $limit: 10 }
                ]);

                if (recentProgress.length > 0) {
                    const slugs = recentProgress.map(p => p.movieSlug);
                    const movies = await Movie.find({ slug: { $in: slugs }, isActive: { $ne: false } })
                        .select('name slug thumb_url year episode_current type poster_url')
                        .lean();

                    responseData.continueWatching = recentProgress.map(p => {
                        const movie = movies.find(m => m.slug === p.movieSlug);
                        if (!movie) return null;
                        // movie is lean object
                        movie.progress = {
                            currentTime: p.currentTime,
                            duration: p.duration,
                            percentage: p.duration > 0 ? Math.round((p.currentTime / p.duration) * 100) : 0,
                            episodeSlug: p.episodeSlug,
                            episodeName: p.episodeName
                        };
                        return movie;
                    }).filter(Boolean);
                } else {
                    responseData.continueWatching = [];
                }

            } catch (error) {
                console.error('Error attaching progress:', error);
            }
        }

        res.json({
            success: true,
            data: responseData,
            debug: { executionTime: `${Date.now() - start}ms` }
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
        let query = { isActive: { $ne: false } };

        // Text search (if 'q' is present)
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { origin_name: { $regex: q, $options: 'i' } },
                { slug: { $regex: q, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            query['category.slug'] = category;

            // Special filters for specific categories to match Home Page logic
            if (category === 'vien-tuong' || category === 'kinh-di' || category === 'hanh-dong' || category === 'hinh-su' || category === 'chien-tranh' || category === 'bi-an') {
                query.type = { $nin: ['hoathinh', 'tvshows'] };
            }
            if (category === 'tinh-cam' || category === 'gia-dinh') {
                query.type = { $ne: 'hoathinh' };
            }
            if (category === 'hoc-duong') {
                query['country.slug'] = 'trung-quoc';
                query.type = { $ne: 'hoathinh' };
            }
        }
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
                    // Filter out external movies that are already in our DB and marked as hidden
                    const activeExternalMovies = [];
                    for (const extMovie of externalMovies) {
                        const localMovie = await Movie.findOne({ slug: extMovie.slug }).select('isActive');
                        if (!localMovie || localMovie.isActive !== false) {
                            activeExternalMovies.push(extMovie);
                        }
                    }

                    if (activeExternalMovies.length > 0) {
                        // In-memory filtering for external results (Year, Type)
                        // Note: Category/Country usually not available in search results, so we can't filter strictly by them.
                        let filteredExternal = activeExternalMovies;

                        if (year) {
                            filteredExternal = filteredExternal.filter(m => m.year === parseInt(year));
                        }
                        if (type) {
                            filteredExternal = filteredExternal.filter(m => m.type === type);
                        }

                        movies = filteredExternal;
                        total = filteredExternal.length;

                        // Background sync (gentle queue)
                        setImmediate(async () => {
                            for (const movie of activeExternalMovies) {
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
        let movie = await Movie.findOne({ slug: req.params.slug, isActive: { $ne: false } });

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
            slug: { $ne: movie.slug },
            isActive: { $ne: false }
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
