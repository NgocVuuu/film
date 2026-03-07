const Movie = require('../models/Movie');
const mongoose = require('mongoose');
const axios = require('axios');
const NodeCache = require('node-cache');
const searchCache = new NodeCache({ stdTTL: 1200 }); // 20 minutes search cache

const { attachProgressToMovies } = require('../utils/movieUtils');
const { syncSpecificMovie } = require('../crawler');

// Rewrite NC (NguonC) m3u8 links to go through server proxy to bypass ISP blocking
// Matches any subdomain of these blocked domains
const NC_PROXY_DOMAINS = ['phimmoi.net', 'streamc.xyz', 'nguonc.com'];
function isNcProxyDomain(hostname) {
    return NC_PROXY_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}
function proxyNcEpisodes(movie, req) {
    if (!movie || !movie.episodes) return movie;
    const host = `${req.protocol}://${req.get('host')}`;
    // Always convert to plain object first
    const movieObj = movie.toObject ? movie.toObject() : (typeof movie === 'object' ? JSON.parse(JSON.stringify(movie)) : movie);
    const episodes = (movieObj.episodes || []).map(server => {
        const serverObj = server.toObject ? server.toObject() : { ...server };
        // Rewrite ALL servers whose link_m3u8 points to a blocked CDN domain
        // (not just NC- prefixed ones, in case server_name format varies)
        const newData = (serverObj.server_data || []).map(ep => {
            const epObj = ep.toObject ? ep.toObject() : { ...ep };
            let m3u8 = epObj.link_m3u8;
            if (m3u8) {
                try {
                    const u = new URL(m3u8);
                    if (isNcProxyDomain(u.hostname)) {
                        m3u8 = `${host}/api/proxy/m3u8?url=${encodeURIComponent(m3u8)}`;
                    }
                } catch (_) {}
            }
            return { ...epObj, link_m3u8: m3u8 };
        });
        return { ...serverObj, server_data: newData };
    });
    return { ...movieObj, episodes };
}

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
// Shared: Multi-region TMDB trending (Hàn + Trung + Âu Mỹ) matched to local DB
const getTmdbTrendingMovies = async () => {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 1; // chỉ lấy phim từ năm ngoái trở lại
    const oneYearAgoStr = `${minYear}-01-01`;

    // Helper: fetch TMDB and match to local DB
    const fetchAndMatch = async (cacheKey, url, countrySlug, limit) => {
        try {
            let tmdbData = searchCache.get(cacheKey);
            if (!tmdbData || tmdbData.length === 0) {
                const res = await axios.get(url, { timeout: 8000 });
                tmdbData = res.data.results || [];
                if (tmdbData.length > 0) searchCache.set(cacheKey, tmdbData, 1800);
            }
            if (!tmdbData || tmdbData.length === 0) return [];

            const tmdbTitles = tmdbData.map(m => m.title || m.name).filter(Boolean);
            const tmdbOriginalTitles = tmdbData.map(m => m.original_title || m.original_name).filter(Boolean);

            const query = {
                isActive: { $ne: false },
                year: { $gte: minYear }, // chỉ phim mới
                $or: [
                    { name: { $in: tmdbTitles } },
                    { origin_name: { $in: tmdbOriginalTitles } }
                ]
            };
            if (countrySlug) query['country.slug'] = countrySlug;

            const localMatches = await Movie.find(query)
                .select('-content -episodes -director -actor').lean();

            // Sort by TMDB popularity order
            const orderMap = new Map();
            tmdbData.forEach((item, index) => {
                if (item.title) orderMap.set(item.title.toLowerCase(), index);
                if (item.name) orderMap.set(item.name.toLowerCase(), index);
                if (item.original_title) orderMap.set(item.original_title.toLowerCase(), index);
                if (item.original_name) orderMap.set(item.original_name.toLowerCase(), index);
            });
            return localMatches.sort((a, b) => {
                const iA = orderMap.get((a.name || '').toLowerCase()) ?? orderMap.get((a.origin_name || '').toLowerCase()) ?? 999;
                const iB = orderMap.get((b.name || '').toLowerCase()) ?? orderMap.get((b.origin_name || '').toLowerCase()) ?? 999;
                return iA - iB;
            }).slice(0, limit);
        } catch (err) {
            console.error(`[TMDB] ${cacheKey} error:`, err.message);
            return [];
        }
    };

    const base = `https://api.themoviedb.org/3`;
    const key = `api_key=${TMDB_API_KEY}`;

    const [koreaResults, chinaResults, usukResults] = await Promise.all([
        // Hàn Quốc: TV trending theo ngôn ngữ ko
        TMDB_API_KEY ? fetchAndMatch(
            'tmdb_trending_ko',
            `${base}/discover/tv?${key}&with_original_language=ko&sort_by=popularity.desc&first_air_date.gte=${oneYearAgoStr}&language=vi`,
            'han-quoc', 4
        ) : Promise.resolve([]),
        // Trung Quốc: TV trending theo ngôn ngữ zh
        TMDB_API_KEY ? fetchAndMatch(
            'tmdb_trending_zh',
            `${base}/discover/tv?${key}&with_original_language=zh&sort_by=popularity.desc&first_air_date.gte=${oneYearAgoStr}&language=vi`,
            'trung-quoc', 3
        ) : Promise.resolve([]),
        // Âu Mỹ: global trending (phim lẻ EN)
        TMDB_API_KEY ? fetchAndMatch(
            'tmdb_trending_global',
            `${base}/trending/movie/day?${key}&language=vi`,
            null, 4
        ) : Promise.resolve([]),
    ]);

    // Merge: Hàn → Trung → Âu Mỹ, dedup theo cả _id lẫn tên
    const seenIds = new Set();
    const seenNames = new Set();
    const result = [];
    for (const movie of [...koreaResults, ...chinaResults, ...usukResults]) {
        const id = movie._id.toString();
        const nameLower = (movie.name || '').toLowerCase();
        if (!seenIds.has(id) && !seenNames.has(nameLower)) {
            seenIds.add(id);
            seenNames.add(nameLower);
            result.push(movie);
        }
        if (result.length >= 10) break;
    }

    // Fallback nếu không đủ 10: phim mới trong 60 ngày
    if (result.length < 10) {
        const localFallback = await Movie.find({
            isActive: { $ne: false },
            year: { $gte: minYear },
            _id: { $nin: [...seenIds] },
            updatedAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
        }).sort({ view: -1 }).limit(10 - result.length).select('-content -episodes -director -actor').lean();
        result.push(...localFallback);
    }

    return result;
};

const getHomeData = async (req, res) => {
    try {
        const start = Date.now();
        // 0. Trending Logic (TMDB + Local Fallback)
        const getTrendingMoviesPromise = getTmdbTrendingMovies();

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
            legendaryAnimeMovies,
            xianxiaMovies
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
            Movie.find({ type: 'hoathinh', year: { $lte: 2015 }, isActive: { $ne: false } }).sort({ view: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean(),
            // 30. Xianxia / Chinese Animation
            Movie.find({ type: 'hoathinh', 'country.slug': 'trung-quoc', isActive: { $ne: false } }).sort({ year: -1, updatedAt: -1 }).limit(15).select('-content -episodes -director -actor').lean()
        ]);

        let responseData = {
            trendingMovies, featuredMovies, upcomingMovies, latestMovies, chinaMovies, koreaMovies,
            usukMovies, cartoonMovies, horrorMovies, familyMovies, thailandMovies,
            japanMovies, actionMovies, romanceMovies, comedyMovies, adventureMovies,
            scifiMovies, crimeMovies, historyDramaMovies, martialArtsMovies, shortDramaMovies,
            tvShows, warMovies, mysteryMovies, schoolMovies, documentaryMovies, fantasyMovies,
            hkMovies, vnMovies, hotAnimeMovies, legendaryAnimeMovies, xianxiaMovies
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
                    ...hkMovies, ...vnMovies, ...hotAnimeMovies, ...legendaryAnimeMovies, ...xianxiaMovies
                ];

                const allSlugs = [...new Set(allMovies.map(m => m.slug))];

                const WatchProgress = require('../models/WatchProgress');
                const allProgress = await WatchProgress.find({
                    userId,
                    movieSlug: { $in: allSlugs }
                }).sort({ lastWatched: 1 }).lean();

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
                            episodeName: p.episodeName,
                            serverName: p.serverName
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
        const { category, country, year, maxYear, status, sort, type, chieurap, q, actor } = req.query;
        let query = { isActive: { $ne: false } };

        // Text search (if 'q' is present)
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { origin_name: { $regex: q, $options: 'i' } },
                { actor: { $regex: q, $options: 'i' } },
                { slug: { $regex: q, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            query['category.slug'] = category;
            // Note: No forced country overrides here — let user's country filter take precedence
        }
        if (country) query['country.slug'] = country;
        // Flexible year filter: specific year, range keywords, or maxYear
        if (year) {
            if (year === 'old') {
                query.year = { $lt: 2020 };
            } else if (year === '2010s') {
                query.year = { $gte: 2010, $lte: 2019 };
            } else if (year === '2000s') {
                query.year = { $gte: 2000, $lte: 2009 };
            } else if (year === '1990s') {
                query.year = { $gte: 1990, $lte: 1999 };
            } else {
                query.year = parseInt(year);
            }
        }
        if (maxYear) query.year = { ...(query.year || {}), $lte: parseInt(maxYear) };
        if (status) query.status = status; // 'completed' | 'ongoing'
        if (type) query.type = type; // 'series' | 'single' | 'hoathinh' | 'tvshows'
        if (chieurap === 'true') query.chieurap = true;
        if (actor) query.actor = actor; // Filter by actor name

        // Sorting
        let sortOption = { updatedAt: -1 }; // Default: Mới cập nhật
        if (sort === 'updated') sortOption = { updatedAt: -1 };
        if (sort === 'year' || sort === 'newest') sortOption = { year: -1, updatedAt: -1 };
        if (sort === 'view') sortOption = { view: -1, updatedAt: -1 };
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

        // Rewrite NC m3u8 links through server proxy
        movieData = proxyNcEpisodes(movieData, req);

        res.json({ success: true, data: movieData, related });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getMarvelMovies = async (req, res) => {
    try {
        const mcuTitles = [
            { en: 'Iron Man', year: 2008 },
            { en: 'The Incredible Hulk', year: 2008 },
            { en: 'Iron Man 2', year: 2010 },
            { en: 'Thor', year: 2011 },
            { en: 'Captain America: The First Avenger', year: 2011 },
            { en: 'The Avengers', year: 2012 },
            { en: 'Iron Man 3', year: 2013 },
            { en: 'Thor: The Dark World', year: 2013 },
            { en: 'Captain America: The Winter Soldier', year: 2014 },
            { en: 'Guardians of the Galaxy', year: 2014 },
            { en: 'Avengers: Age of Ultron', year: 2015 },
            { en: 'Ant-Man', year: 2015 },
            { en: 'Captain America: Civil War', year: 2016 },
            { en: 'Doctor Strange', year: 2016 },
            { en: 'Guardians of the Galaxy Vol. 2', year: 2017 },
            { en: 'Spider-Man: Homecoming', year: 2017 },
            { en: 'Thor: Ragnarok', year: 2017 },
            { en: 'Black Panther', year: 2018 },
            { en: 'Avengers: Infinity War', year: 2018 },
            { en: 'Ant-Man and the Wasp', year: 2018 },
            { en: 'Captain Marvel', year: 2019 },
            { en: 'Avengers: Endgame', year: 2019 },
            { en: 'Spider-Man: Far From Home', year: 2019 },
            { en: 'Black Widow', year: 2021 },
            { en: 'Shang-Chi and the Legend of the Ten Rings', year: 2021 },
            { en: 'Eternals', year: 2021 },
            { en: 'Spider-Man: No Way Home', year: 2021 },
            { en: 'Doctor Strange in the Multiverse of Madness', year: 2022 },
            { en: 'Thor: Love and Thunder', year: 2022 },
            { en: 'Black Panther: Wakanda Forever', year: 2022 },
            { en: 'Ant-Man and the Wasp: Quantumania', year: 2023 },
            { en: 'Guardians of the Galaxy Vol. 3', year: 2023 },
            { en: 'The Marvels', year: 2023 },
            { en: 'Deadpool & Wolverine', year: 2024 },
            { en: 'Captain America: Brave New World', year: 2025 },
            { en: 'Thunderbolts', year: 2025 },
            { en: 'The Fantastic 4: First Steps', year: 2025 },
        ];

        const results = [];

        for (const mcu of mcuTitles) {
            const escaped = mcu.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Find candidates matching title
            const candidates = await Movie.find({
                isActive: { $ne: false },
                origin_name: { $regex: `^${escaped}$`, $options: 'i' }
            })
                .select('name slug thumb_url origin_name year type quality episode_current view')
                .lean();

            if (candidates.length === 0) continue;

            // Pick the one with year closest to official release year
            const best = candidates.reduce((a, b) =>
                Math.abs((a.year || 0) - mcu.year) <= Math.abs((b.year || 0) - mcu.year) ? a : b
            );
            best._mcuYear = mcu.year; // for sorting
            results.push(best);
        }

        // Sort by official MCU release year
        results.sort((a, b) => (a._mcuYear || a.year) - (b._mcuYear || b.year));
        results.forEach(m => delete m._mcuYear);

        res.json({ success: true, data: results, total: results.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getDCUMovies = async (req, res) => {
    try {
        const dcuTitles = [
            { en: 'Man of Steel', year: 2013 },
            { en: 'Batman v Superman: Dawn of Justice', year: 2016 },
            { en: 'Suicide Squad', year: 2016 },
            { en: 'Wonder Woman', year: 2017 },
            { en: 'Justice League', year: 2017 },
            { en: 'Zack Snyder\'s Justice League', year: 2021 }, // Bonus if exists
            { en: 'Aquaman', year: 2018 },
            { en: 'Shazam!', year: 2019 },
            { en: 'Birds of Prey', year: 2020 },
            { en: 'Wonder Woman 1984', year: 2020 },
            { en: 'The Suicide Squad', year: 2021 },
            { en: 'Peacemaker', year: 2022 }, // Bonus if exists
            { en: 'Black Adam', year: 2022 },
            { en: 'Shazam! Fury of the Gods', year: 2023 },
            { en: 'The Flash', year: 2023 },
            { en: 'Blue Beetle', year: 2023 },
            { en: 'Aquaman and the Lost Kingdom', year: 2023 }
        ];

        const results = [];

        for (const dcu of dcuTitles) {
            const escaped = dcu.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Allow loose matching (e.g. "Birds of Prey" might have a longer sub-title in DB)
            const candidates = await Movie.find({
                isActive: { $ne: false },
                $or: [
                    { origin_name: { $regex: escaped, $options: 'i' } },
                    { name: { $regex: escaped, $options: 'i' } }
                ]
            })
                .select('name slug thumb_url origin_name year type quality episode_current view')
                .lean();

            if (candidates.length === 0) continue;

            // Pick the one closest to the official release year
            const best = candidates.reduce((a, b) =>
                Math.abs((a.year || 0) - dcu.year) <= Math.abs((b.year || 0) - dcu.year) ? a : b
            );

            // To handle cases where we find a mismatch but want to avoid duplicates
            if (!results.find(r => r.slug === best.slug)) {
                best._dcuYear = dcu.year; // for sorting
                results.push(best);
            }
        }

        // Sort by official DCU release year
        results.sort((a, b) => (a._dcuYear || a.year) - (b._dcuYear || b.year));
        results.forEach(m => delete m._dcuYear);

        res.json({ success: true, data: results, total: results.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getStephenChowMovies = async (req, res) => {
    try {
        const stephenChowTitles = [
            { vi: 'Quyết Chiến Giang Hồ', en: 'Dragon Fight', year: 1989 },
            { vi: 'Anh Hùng Của Tôi', en: 'My Hero', year: 1990 },
            { vi: 'Đỗ Thánh', en: 'All For The Winner', year: 1990 },
            { vi: 'Sư Huynh Trúng Tà', en: 'Look Out Officer', year: 1990 },
            { vi: 'Tình Yêu Và Cuộc Đời', en: 'Love Is Love', year: 1990 },
            { vi: 'Trà Lầu Long Phụng', en: 'Lung Fung Restaurant', year: 1990 },
            { vi: 'Vô Địch Vận Hạnh Tinh', en: 'When Fortune Smiles', year: 1990 },
            { vi: 'Vỏ Quýt Dày Có Móng Tay Nhọn', en: 'Curry And Pepper', year: 1990 },
            { vi: 'Chuyên Gia Xảo Quyệt', en: 'Tricky Brains', year: 1991 },
            { vi: 'Đỗ Thánh 2', en: 'God Of Gamblers II', year: 1991 },
            { vi: 'Đỗ Thánh 3', en: 'God Of Gamblers Back To Shanghai', year: 1991 },
            { vi: 'Tân Tinh Võ Môn', en: 'Fist of Fury I', year: 1991 },
            { vi: 'Tình Thánh', en: 'The Magnificent Scoundrels', year: 1991 },
            { vi: 'Trường Học Uy Long', en: 'Fight Back To School', year: 1991 },
            { vi: 'Long Tích Truyền Nhân', en: 'Legend Of The Dragon', year: 1991 },
            { vi: 'Tân Tinh Võ Môn 2', en: 'Fist of Fury II', year: 1992 },
            { vi: 'Gia Hữu Hỷ Sự', en: 'All’s Well End’s Well', year: 1992 },
            { vi: 'Trạng Nguyên Tô Khất Nhi', en: 'King Of Beggars', year: 1992 },
            { vi: 'Trường Học Uy Long 2', en: 'Fight Back To School II', year: 1992 },
            { vi: 'Xẩm Xử Quan', en: 'Justice, My Foot', year: 1992 },
            { vi: 'Tân Lộc Đỉnh Ký', en: 'Royal Tramp', year: 1992 },
            { vi: 'Tân Lộc Đỉnh Ký 2', en: 'Royal Tramp II', year: 1992 },
            { vi: 'Đường Bá Hổ Điểm Thu Hương', en: 'Flirting Scholar', year: 1993 },
            { vi: 'Tế Công', en: 'The Mad Monk', year: 1993 },
            { vi: 'Trường Học Uy Long 3', en: 'Fight Back To School III', year: 1993 },
            { vi: 'Quan Xẩm Lốc Cốc', en: 'Hail the Judge', year: 1994 },
            { vi: 'Quốc Sản 007', en: 'From Beijing with love', year: 1994 },
            { vi: 'Vua Phá Hoại', en: 'Love On Delivery', year: 1994 },
            { vi: 'Bách Biến Tinh Quân', en: 'Sixty Million Dollar Man', year: 1995 },
            { vi: 'Chuyên Gia Bắt Ma', en: 'Out Of The Dark', year: 1995 },
            { vi: 'Tây Du Ký: Nguyệt Quang Bảo Hạp', en: 'A Chinese Odyssey I: Pandora’s Box', year: 1995 },
            { vi: 'Tây Du Ký: Tiên Lý Kì Duyên', en: 'A Chinese Odyssey II: Cinderella', year: 1995 },
            { vi: 'Đại Nội Mật Thám', en: 'Forbidden City Cop', year: 1996 },
            { vi: 'Thần Ăn', en: 'The God Of Cookery', year: 1996 },
            { vi: 'Gia Hữu Hỷ Sự 1997', en: 'All’s Well End’s Well 1997', year: 1997 },
            { vi: 'Trạng Sư Xảo Quyệt', en: 'Lawyer Lawyer', year: 1997 },
            { vi: 'Hoàng Tử Bánh Trứng', en: 'The Lucky Guy', year: 1998 },
            { vi: 'Phán Xét Cuối Cùng', en: 'Final Justice', year: 1988 },
            { vi: 'Tình Anh Thợ Cạo', en: 'Faithfully Yours', year: 1988 },
            { vi: 'Bịp Vương 2000', en: 'The Tricky Master', year: 1999 },
            { vi: 'Vua Hài Kịch', en: 'The King Of Comedy', year: 1999 },
            { vi: 'Đội Bóng Thiếu Lâm', en: 'Shaolin Soccer', year: 2001 },
            { vi: 'Tuyệt Đỉnh Kungfu', en: 'Kungfu Hustle', year: 2004 },
            { vi: 'Siêu Khuyển Thần Thông', en: 'CJ7', year: 2008 },
            { vi: 'Tây Du Ký: Mối Tình Ngoại Truyện', en: 'Journey to the West: Conquering the Demons', year: 2013 },
            { vi: 'Mỹ Nhân Ngư', en: 'The Mermaid', year: 2016 },
            { vi: 'Tây Du Ký: Mối Tình Ngoại Truyện 2', en: 'Journey to the West: The Demons Strike Back', year: 2017 },
            { vi: 'Tuyệt đỉnh Kungfu 2', en: 'Kungfu Hustle 2', year: 2025 }
        ];

        const results = [];

        for (const titleObj of stephenChowTitles) {
            // Normalize for matching
            const nVi = titleObj.vi.toLowerCase().replace(/[^a-z0-9]/g, '');
            const candidates = await Movie.find({
                isActive: { $ne: false },
                $or: [
                    { name: { $regex: titleObj.vi, $options: 'i' } },
                    { origin_name: { $regex: titleObj.en, $options: 'i' } },
                    { actor: { $regex: 'Châu Tinh Trì', $options: 'i' } } // Bonus hook
                ]
            }).select('name slug thumb_url origin_name year type quality episode_current view actor').lean();

            if (candidates.length === 0) continue;

            const strictCandidates = candidates.filter(c => {
                const cName = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const cOrigin = (c.origin_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                const checkVi = titleObj.vi.toLowerCase().replace(/[^a-z0-9]/g, '');
                const checkEn = titleObj.en.toLowerCase().replace(/[^a-z0-9]/g, '');

                const hasActor = c.actor && Array.isArray(c.actor) && c.actor.some(a => /châu tinh trì|stephen chow/i.test(a));

                // If exact matching name
                if (cName === checkVi || cOrigin === checkEn) {
                    // EXCLUSION: If it matches "Đường Bá Hổ Điểm Thu Hương" but it's the 2019 version, skip it
                    if (c.name && c.name.includes('Đường Bá Hổ') && c.year === 2019) return false;
                    if (c.origin_name && c.origin_name.includes('Flirting Scholar') && c.year === 2019) return false;

                    // EXCLUSION: If it matches "Tuyệt Đỉnh Kungfu" but it's "Lục Vân Tiên" specifically
                    if (c.slug && c.slug.includes('luc-van-tien')) return false;

                    return true;
                }

                // If includes name AND has actor match (e.g. Lục Vân Tiên Tuyệt Đỉnh Kungfu won't pass without Chow as actor)
                if ((cName.includes(checkVi) || cOrigin.includes(checkEn)) && hasActor) return true;

                return false;
            });

            if (strictCandidates.length > 0) {
                // Return best year match to deduplicate
                const best = strictCandidates.reduce((a, b) =>
                    Math.abs((a.year || 0) - titleObj.year) <= Math.abs((b.year || 0) - titleObj.year) ? a : b
                );

                if (!results.find(r => r.slug === best.slug)) {
                    best._cttYear = titleObj.year;
                    results.push(best);
                }
            }
        }

        // Also find all movies acting by him to capture those not in the list
        const extraMovies = await Movie.find({
            isActive: { $ne: false },
            actor: { $regex: /châu tinh trì/i }
        }).select('name slug thumb_url origin_name year type quality episode_current view actor').lean();

        for (const extra of extraMovies) {
            if (!results.find(r => r.slug === extra.slug)) {
                extra._cttYear = extra.year || 1990;
                results.push(extra);
            }
        }

        results.sort((a, b) => (a._cttYear || a.year) - (b._cttYear || b.year));
        results.forEach(m => delete m._cttYear);

        res.json({ success: true, data: results, total: results.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getKoreanDrama2016Movies = async (req, res) => {
    try {
        const dramas = [
            { vi: 'Reply 1988', en: ['Reply 1988', 'Hồi đáp 1988', 'Lời Hồi Đáp 1988'], year: 2015 },
            { vi: 'Hậu Duệ Mặt Trời', en: ['Descendants of the Sun', 'Descendants Of The Sun'], year: 2016 },
            { vi: 'Lại Là Oh Hae Young', en: ['Another Oh Hae-young', 'Another Miss Oh', 'Oh Hae Young Again'], year: 2016 },
            { vi: 'Chuyện Tình Bác Sĩ', en: ['Doctors'], year: 2016, slug: 'chuyen-tinh-bac-si' },
            { vi: 'Yêu Không Kiểm Soát', en: ['Uncontrollably Fond', 'Uncontrollable Fond', 'Lightly, Mascara'], year: 2016 },
            { vi: 'Mây Họa Ánh Trăng', en: ['Love in the Moonlight', 'Moonlight Drawn by Clouds', 'Gureumi Geurin Dalbit'], year: 2016 },
            { vi: 'Người Tình Ánh Trăng', en: ['Moon Lovers: Scarlet Heart Ryeo', 'Moon Lovers', 'Scarlet Heart Ryeo', 'Scarlet Heart'], year: 2016 },
            { vi: 'Mật Danh K2', en: ['The K2'], year: 2016, slug: 'mat-danh-k2' },
            { vi: 'Người Thầy Y Đức', en: ['Romantic Doctor Teacher Kim', 'Romantic Doctor', 'Teacher Kim'], year: 2016, slug: 'nguoi-thay-y-duc-phan-1' },
            { vi: 'Huyền Thoại Biển Xanh', en: ['The Legend of the Blue Sea', 'Legend of the Blue Sea'], year: 2016, slug: 'huyen-thoai-bien-xanh' },
            { vi: 'Cô Nàng Cử Tạ Kim Bok Joo', en: ['Weightlifting Fairy Kim Bok-joo', 'Weightlifting Fairy'], year: 2016 },
            { vi: 'Yêu Tinh', en: ['Guardian: The Lonely and Great God', 'Goblin', 'Dokkaebi'], year: 2016, slug: 'yeu-tinh-goblin' },
        ];

        const results = [];
        for (const drama of dramas) {
            let movie;

            if (drama.slug) {
                movie = await Movie.findOne({ slug: drama.slug, isActive: { $ne: false } })
                    .select('name slug thumb_url poster_url origin_name year type quality episode_current view')
                    .lean();

                // If slug provided but not found, we still allow regex fallback as a safety measure
                // but we will prioritize this slug search.
            }

            if (!movie) {
                const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const enNames = Array.isArray(drama.en) ? drama.en : [drama.en];

                const orClauses = [
                    { name: { $regex: escape(drama.vi), $options: 'i' } },
                    ...enNames.map(e => ({ origin_name: { $regex: escape(e), $options: 'i' } })),
                ];

                const candidates = await Movie.find({
                    isActive: { $ne: false },
                    $or: orClauses,
                })
                    .select('name slug thumb_url poster_url origin_name year type quality episode_current view')
                    .lean();

                if (candidates.length > 0) {
                    movie = candidates.reduce((a, b) =>
                        Math.abs((a.year || 0) - drama.year) <= Math.abs((b.year || 0) - drama.year) ? a : b
                    );
                }
            }

            if (movie) {
                movie._vi = drama.vi;
                movie._order = dramas.indexOf(drama);
                results.push(movie);
            }
        }

        results.sort((a, b) => a._order - b._order);
        results.forEach(m => delete m._order);

        res.json({ success: true, data: results, total: results.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getSadMovies = async (req, res) => {
    try {
        // Only verified slugs from DB audit — name search was causing false positives
        const confirmedSlugs = [
            // --- Đã xác nhận từ trước ---
            'dieu-ba-me-khong-ke',              // Điều Ba Mẹ Không Kể (Romang, 2019)
            'bi-thuong-nguoc-dong-thanh-song',  // Bi Thương Ngược Dòng Sông (2018)
            'ngay-em-dep-nhat',                 // Ngày Em Đẹp Nhất (On Your Wedding Day, 2018)
            'goi-em-bang-ten-anh',              // Gọi Em Bằng Tên Anh (Call Me By Your Name, 2017)
            'truoc-ngay-em-den',                // Trước Ngày Em Đến (Me Before You, 2016)
            'mong-em-hanh-phuc',                // Mong Em Hạnh Phúc (More Than Blue, 2018)
            'cuoc-doi-forrest-gump',            // Cuộc Đời Forrest Gump (1994)
            'titanic',                          // Titanic (1997)
            'mo-dom-dom',                       // Mộ Đom Đóm (Grave of the Fireflies, 1988)
            'chuoc-loi-chuoc-toi',              // Chuộc Lỗi (Atonement, 2007)
            // --- Slug xác nhận thêm ---
            'josee-nang-tho-cua-toi',           // Josée, Nàng Thơ Của Tôi (2020)
            'chung-ta-cua-sau-nay',             // Chúng Ta Của Sau Này - Us And Them (2018)
            'vi-sao-vut-sang',                  // Vì Sao Vụt Sáng - A Star Is Born (2018)
            'chuyen-tinh-cay-tao-gai',          // Chuyện Tình Cây Táo Gai (2010)
            'buoc-ngoat-dang-nho',              // Bước Ngoặt Đáng Nhớ - A Walk to Remember (2002)
            'con-trai-khong-khoc',              // Con Trai Không Khóc - Boys Don't Cry (1999)
            'chuyen-tinh-sau-nui',              // Chuyện Tình Sau Núi - Brokeback Mountain (2005)
            'khi-loi-thuoc-ve-nhung-vi-sao',    // Khi Lỗi Thuộc Về Những Vì Sao (2014)
            'nam-buoc-de-yeu',                  // Năm Bước Để Yêu - Five Feet Apart (2019)
            // --- Thêm mới ---
            'dong-cung',                        // Đông Cung (2019)
            'hon-le-cua-em',                    // Hôn Lễ Của Em (2021)
            'truong-an-nhu-co',                 // Trường An Như Cố (2021)
            'dieu-ky-dieu-o-phong-giam-so-7',   // Điều Kỳ Diệu Ở Phòng Giam Số 7 (2013)
            'nguoi-tinh-anh-trang',             // Người Tình Ánh Trăng (2016)
            'khi-cuoc-doi-cho-ban-qua-quyt',    // Khi Cuộc Đời Cho Bạn Quá Quýt (2025)
            'nu-hoang-nuoc-mat',                // Nữ Hoàng Nước Mắt - Queen of Tears (2024)
        ];

        const movies = await Movie.find({ slug: { $in: confirmedSlugs }, isActive: { $ne: false } })
            .select('name slug thumb_url origin_name year type quality episode_current view')
            .lean();

        // Sort by year desc
        movies.sort((a, b) => (b.year || 0) - (a.year || 0));

        res.json({ success: true, data: movies, total: movies.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


const clearTmdbCache = async (req, res) => {
    searchCache.del('tmdb_trending_ko');
    searchCache.del('tmdb_trending_zh');
    searchCache.del('tmdb_trending_global');
    console.log('[ADMIN] TMDB trending cache cleared manually');
    res.json({ success: true, message: 'TMDB trending cache cleared. Next home page request will fetch fresh data from TMDB.' });
};

// Debug endpoint: kiểm tra TMDB API key, raw results và DB matching
const debugTmdb = async (req, res) => {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 1;
    const report = { apiKeyPresent: !!TMDB_API_KEY, minYear, endpoints: [] };

    const endpoints = [
        { name: 'Korea (TV)', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ko&sort_by=popularity.desc&first_air_date.gte=${minYear}-01-01&language=vi` },
        { name: 'China (TV)', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=zh&sort_by=popularity.desc&first_air_date.gte=${minYear}-01-01&language=vi` },
        { name: 'Global (Movie)', url: `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=vi` },
    ];

    for (const ep of endpoints) {
        const info = { name: ep.name, tmdbTitles: [], dbMatches: 0, dbMatchTitles: [] };
        try {
            const res2 = await axios.get(ep.url, { timeout: 8000 });
            const items = res2.data.results || [];
            info.tmdbTitles = items.slice(0, 10).map(m => ({ title: m.title || m.name, original: m.original_title || m.original_name }));

            const allTitles = items.map(m => m.title || m.name).filter(Boolean);
            const allOriginals = items.map(m => m.original_title || m.original_name).filter(Boolean);
            const matches = await Movie.find({
                isActive: { $ne: false },
                year: { $gte: minYear },
                $or: [{ name: { $in: allTitles } }, { origin_name: { $in: allOriginals } }]
            }).select('name origin_name year').lean();
            info.dbMatches = matches.length;
            info.dbMatchTitles = matches.map(m => `${m.name} (${m.year})`);
        } catch (err) {
            info.error = err.message;
        }
        report.endpoints.push(info);
    }

    res.json(report);
};

module.exports = {
    getHomeData,
    getMovies,
    getMovieDetail,
    getMarvelMovies,
    clearTmdbCache,
    getTmdbTrendingMovies,
    debugTmdb,
    getDCUMovies,
    getStephenChowMovies,
    getKoreanDrama2016Movies,
    getSadMovies,
};
