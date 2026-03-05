const axios = require('axios');
const cron = require('node-cron');
const Movie = require('./models/Movie');
const Favorite = require('./models/Favorite');
const Notification = require('./models/Notification');
const WatchProgress = require('./models/WatchProgress');
const { sendToMultiple } = require('./utils/notificationService');

const OPHIM_API_HOME = 'https://ophim1.com/v1/api/home';
const OPHIM_API_DETAIL = 'https://ophim1.com/v1/api/phim';
const OPHIM_API_LIST = 'https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat';

const KKPHIM_API_HOME = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
const KKPHIM_API_DETAIL = 'https://phimapi.com/phim';

const NGUONC_API_HOME = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat';
const NGUONC_API_DETAIL = 'https://phim.nguonc.com/api/film';

// Config
const CONCURRENCY_LIMIT = 5; // Parallel requests
const RATE_LIMIT_DELAY = 500; // ms
const MAX_RETRIES = 3;

// State
let isRunning = false;
let blacklist = new Set();
let currentPage = 1;

// Utils
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ADAPTERS = {
    OPHIM: {
        name: 'OPHIM',
        prefix: 'OP',
        getPage: async (page = 1) => {
            try {
                const res = await axios.get(`${OPHIM_API_LIST}?page=${page}`);
                return res.data.data ? res.data.data.items : [];
            } catch (e) {
                console.error('Error fetching OPHIM page:', e.message);
                return [];
            }
        },
        getDetail: async (slug) => {
            try {
                const res = await axios.get(`${OPHIM_API_DETAIL}/${slug}`);
                if (!res.data.status) return null;
                const movie = res.data.data.item;
                const rawEpisodes = res.data.data.item.episodes || [];
                const episodes = rawEpisodes.map(epGroup => ({
                    ...epGroup,
                    server_name: epGroup.server_name || 'Vietsub'
                }));
                return { movie, episodes };
            } catch (e) { return null; }
        },
        search: async (query) => {
            try {
                const res = await axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
                if (!res.data.status || !res.data.data?.items) return [];
                const domainImages = res.data.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live/uploads/movies/';
                return res.data.data.items.map(m => ({
                    name: m.name,
                    origin_name: m.origin_name,
                    slug: m.slug,
                    year: m.year,
                    thumb_url: m.thumb_url.startsWith('http') ? m.thumb_url : `${domainImages}${m.thumb_url}`,
                    source: 'OPHIM'
                }));
            } catch (e) {
                console.error('Error searching OPHIM:', e.message);
                return [];
            }
        },
        processImage: (path, domain) => {
            if (!path) return '';
            if (path.startsWith('http')) return path;
            const base = domain || 'https://img.ophim.live/uploads/movies/';
            return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
        }
    },
    KKPHIM: {
        name: 'KKPHIM',
        prefix: 'KK',
        getPage: async (page = 1) => {
            try {
                const res = await axios.get(`${KKPHIM_API_HOME}?page=${page}`);
                return res.data.items || [];
            } catch (e) { return []; }
        },
        getDetail: async (slug) => {
            try {
                const res = await axios.get(`${KKPHIM_API_DETAIL}/${slug}`);
                if (!res.data.status) return null;
                const movie = res.data.movie;
                const rawEpisodes = res.data.episodes || [];

                const episodes = rawEpisodes.map(epGroup => ({
                    ...epGroup,
                    server_name: epGroup.server_name || 'Vietsub'
                }));

                return { movie, episodes };
            } catch (e) { return null; }
        },
        search: async (query) => {
            try {
                const res = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
                if (!res.data.status || !res.data.data?.items) return [];
                const domainImages = res.data.data.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com/';
                return res.data.data.items.map(m => ({
                    name: m.name,
                    origin_name: m.origin_name,
                    slug: m.slug,
                    year: m.year,
                    thumb_url: m.thumb_url.startsWith('http') ? m.thumb_url : `${domainImages}${m.thumb_url}`,
                    source: 'KKPHIM'
                }));
            } catch (e) {
                console.error('Error searching KKPHIM:', e.message);
                return [];
            }
        },
        processImage: (path) => {
            if (!path) return '';
            if (path.startsWith('http')) return path;
            const base = 'https://phimimg.com';
            return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
        }
    },
    NGUONC: {
        name: 'NGUONC',
        prefix: 'NC',
        getPage: async (page = 1) => {
            try {
                const res = await axios.get(`${NGUONC_API_HOME}?page=${page}`);
                return res.data.items || [];
            } catch (e) { return []; }
        },
        getDetail: async (slug) => {
            try {
                const res = await axios.get(`${NGUONC_API_DETAIL}/${slug}`);
                if (res.data.status === 'error') return null;
                const movie = res.data.movie;
                const rawEpisodes = movie.episodes || [];
                const episodes = rawEpisodes.map(server => ({
                    server_name: server.server_name || 'Vietsub',
                    server_data: server.items.map(item => ({
                        name: item.name,
                        slug: item.slug,
                        link_m3u8: item.m3u8,
                        link_embed: item.embed,
                        filename: item.name
                    }))
                }));

                // Extract year from category if top level is missing
                let year = movie.year;
                if (!year && movie.category) {
                    // Category is an object with numeric keys or an array
                    const catObj = movie.category;
                    const yearGroup = Object.values(catObj).find(g => g.group && g.group.name === 'Năm');
                    if (yearGroup && yearGroup.list && yearGroup.list.length > 0) {
                        year = parseInt(yearGroup.list[0].name);
                    }
                }

                const normalizedMovie = {
                    ...movie,
                    origin_name: movie.original_name,
                    thumb_url: movie.thumb_url,
                    poster_url: movie.poster_url,
                };

                return { movie: normalizedMovie, episodes };
            } catch (e) {
                return null;
            }
        },
        search: async (query) => {
            try {
                const res = await axios.get(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(query)}`);
                if (res.data.status === 'error' || !res.data.items) return [];
                return res.data.items.map(m => ({
                    name: m.name,
                    origin_name: m.original_name,
                    slug: m.slug,
                    year: m.year, // Nguonc year logic might be better here but we take standard
                    thumb_url: m.thumb_url.startsWith('http') ? m.thumb_url : `https://phim.nguonc.com${m.thumb_url.startsWith('/') ? m.thumb_url : `/${m.thumb_url}`}`,
                    source: 'NGUONC'
                }));
            } catch (e) {
                console.error('Error searching NGUONC:', e.message);
                return [];
            }
        },
        processImage: (path) => {
            if (!path) return '';
            if (path.startsWith('http')) return path;
            const base = 'https://phim.nguonc.com';
            return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
        }
    }
};

async function processMovie(adapter, slug, retryCount = 0) {
    if (blacklist.has(slug)) return { success: false, slug, error: 'Blacklisted' };

    try {
        await sleep(Math.random() * RATE_LIMIT_DELAY);

        const detailData = await adapter.getDetail(slug);
        if (!detailData) {
            if (retryCount < MAX_RETRIES) {
                // console.log(`[Retry ${retryCount + 1}] ${slug} (Detail fetch failed)`);
                await sleep(1000 * (retryCount + 1));
                return processMovie(adapter, slug, retryCount + 1);
            }
            console.error(`[FAILED] ${slug} - Max retries reached (Detail not found). Added to blacklist.`);
            blacklist.add(slug);
            return { success: false, slug, error: 'Detail not found' };
        }

        const { movie, episodes } = detailData;

        const processedEpisodes = episodes.map(epGroup => ({
            ...epGroup,
            server_name: `${adapter.prefix} - ${epGroup.server_name}`.trim()
        }));

        const thumb = adapter.processImage(movie.thumb_url);
        const poster = adapter.processImage(movie.poster_url);

        const coreData = {
            name: movie.name,
            origin_name: movie.origin_name,
            slug: movie.slug,
            content: movie.content,
            type: movie.type,
            status: movie.status,
            thumb_url: thumb,
            poster_url: poster,
            is_copyright: movie.is_copyright || false,
            sub_docquyen: movie.sub_docquyen || false,
            chieurap: movie.chieurap || false,
            trailer_url: movie.trailer_url,
            time: movie.time,
            episode_current: movie.episode_current,
            episode_total: movie.episode_total,
            quality: movie.quality,
            lang: movie.lang,
            notify: movie.notify,
            showtimes: movie.showtimes,
            year: movie.year,
            view: movie.view,
            actor: movie.actor,
            director: movie.director,
            category: movie.category,
            country: movie.country,
            country: movie.country,
            updatedAt: new Date(movie.modified?.time || Date.now())
        };

        const existingMovie = await Movie.findOne({ slug: slug });

        // Logic View: Keep old view if exists, else 0 for new movies
        let finalView = coreData.view || 0;
        if (existingMovie && existingMovie.view > 0) {
            finalView = existingMovie.view;
        }
        coreData.view = finalView;

        let finalEpisodes = processedEpisodes;

        if (existingMovie) {
            const otherSourceEpisodes = existingMovie.episodes.filter(ep => {
                const name = ep.server_name;
                if (name.startsWith(`${adapter.prefix} -`)) return false;
                if (adapter.prefix === 'OP') {
                    const isKK = name.startsWith('KK -');
                    const isNC = name.startsWith('NC -');
                    if (!isKK && !isNC) return false;
                }
                return true;
            });
            finalEpisodes = [...otherSourceEpisodes, ...processedEpisodes];
        }

        // Sort episodes by priority: KK > NC > OP
        finalEpisodes.sort((a, b) => {
            const getScore = (name) => {
                if (!name) return 0;
                const upperName = name.toUpperCase();
                if (upperName.includes('KK -')) return 30;
                if (upperName.includes('NC -')) return 20;
                if (upperName.includes('OP -')) return 10;
                return 0; // Fallback
            };

            // Primary sort by priority source score
            const scoreDiff = getScore(b.server_name) - getScore(a.server_name);
            if (scoreDiff !== 0) return scoreDiff;

            // Secondary sort: Vietsub > Thuyết Minh if sources are the same
            const aIsVietSub = a.server_name && a.server_name.toLowerCase().includes('vietsub');
            const bIsVietSub = b.server_name && b.server_name.toLowerCase().includes('vietsub');
            if (aIsVietSub && !bIsVietSub) return -1;
            if (!aIsVietSub && bIsVietSub) return 1;

            return 0;
        });

        // Check for new episodes to notify
        if (existingMovie) {
            const oldEpCount = existingMovie.episodes ? existingMovie.episodes.reduce((acc, cur) => acc + (cur.server_data ? cur.server_data.length : 0), 0) : 0;
            const newEpCount = finalEpisodes.reduce((acc, cur) => acc + (cur.server_data ? cur.server_data.length : 0), 0);

            // Determine best episode name to display (fallback to last episode if current is missing)
            // Use a clean display identifier for lastNotifiedEpisode check
            const currentEpName = movie.episode_current ||
                (finalEpisodes[0]?.server_data?.length > 0 ?
                    finalEpisodes[0].server_data[finalEpisodes[0].server_data.length - 1].name : '');

            // Clean display identifier (avoid 'undefined' string)
            const displayEp = currentEpName && currentEpName !== 'undefined' ? currentEpName : null;

            // Completion check: Is this movie already considered finished?
            const isFinishedLabels = ['Full', 'Hoàn tất', 'Trọn bộ', '1/1', 'Tập cuối'];
            const wasFinished = existingMovie.status === 'completed' ||
                isFinishedLabels.some(label => existingMovie.lastNotifiedEpisode?.includes(label) ||
                    existingMovie.episode_current?.includes(label));

            const isNowFinished = movie.status === 'completed' ||
                isFinishedLabels.some(label => movie.episode_current?.includes(label));

            // Notify if:
            // 1. Episode count increased OR status changed OR current episode name changed
            // 2. AND we haven't notified for this specific episode yet
            const hasChange = newEpCount > oldEpCount ||
                (existingMovie.episode_current !== movie.episode_current && movie.episode_current && movie.episode_current !== 'Full');

            const isNewEpisode = displayEp && displayEp !== existingMovie.lastNotifiedEpisode;

            // Only notify if there's a real change AND it wasn't already marked as finished
            // Exceptions: we always notify if it's the FIRST time it becomes "Full/Completed"
            const shouldNotify = (hasChange && isNewEpisode) && (!wasFinished || (isNowFinished && !wasFinished));

            if (shouldNotify) {
                // Find all users interested in this movie:
                // 1. Users who favorited it
                const favorites = await Favorite.find({ movieSlug: slug }).select('user');

                // 2. Users who are currently watching it
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const viewers = await WatchProgress.find({
                    movieSlug: slug,
                    updatedAt: { $gte: thirtyDaysAgo }
                }).select('userId');

                // Combine and de-duplicate user IDs
                const userIds = new Set();
                favorites.forEach(f => userIds.add(f.user.toString()));
                viewers.forEach(v => userIds.add(v.userId.toString()));

                if (userIds.size > 0) {
                    const uniqueUserIds = Array.from(userIds);
                    await sendToMultiple(uniqueUserIds, {
                        title: '🎬 Cập nhật tập mới',
                        content: `Phim "${movie.name || 'Phim mới'}" vừa cập nhật tập mới${displayEp ? ` (${displayEp})` : ''}!`,
                        link: `/movie/${slug}`,
                        type: 'episode',
                        icon: thumb || '/logo.png'
                    });
                    console.log(`[NOTIFY] Sent notifications to ${uniqueUserIds.length} users for ${slug} (${movie.name || 'Unknown'}) - Ep: ${displayEp}`);
                }

                // Update lastNotifiedEpisode to prevent spamming this same episode in next crawl
                coreData.lastNotifiedEpisode = displayEp;
            } else {
                // Keep the old lastNotifiedEpisode if we didn't send a new one
                coreData.lastNotifiedEpisode = existingMovie.lastNotifiedEpisode;
            }
        }

        const updatePayload = {
            ...coreData,
            episodes: finalEpisodes
        };

        await Movie.findOneAndUpdate({ slug: slug }, updatePayload, { upsert: true, new: true });
        return { success: true, name: movie.name, slug };

    } catch (err) {
        if (retryCount < MAX_RETRIES) {
            // console.log(`[Retry ${retryCount + 1}] ${slug} (Error: ${err.message})`);
            await sleep(1000 * (retryCount + 1));
            return processMovie(adapter, slug, retryCount + 1);
        }
        console.error(`[FAILED] ${slug} - Error: ${err.message}. Added to blacklist.`);
        blacklist.add(slug);
        return { success: false, slug, error: err.message };
    }
}

async function syncPage(adapter, page) {
    if (!isRunning) return 0;

    // console.log(`[${adapter.name}] Crawling page ${page}...`);
    const movies = await adapter.getPage(page);

    if (!movies || movies.length === 0) return 0;

    const results = [];
    for (let i = 0; i < movies.length; i += CONCURRENCY_LIMIT) {
        const chunk = movies.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(item => {
            if (!item.slug) return Promise.resolve({ success: false, error: 'No slug' });
            return processMovie(adapter, item.slug);
        });
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        await sleep(RATE_LIMIT_DELAY);
    }

    const successes = results.filter(r => r && r.success).length;
    const failures = results.filter(r => !r || !r.success).length;

    if (failures > 0) {
        addLog(`[${adapter.name}] Page ${page}: ${successes} synced, ${failures} failed.`, 'warning');
        console.warn(`[${adapter.name}] Page ${page}: ${successes} synced, ${failures} failed.`);
    } else {
        addLog(`[${adapter.name}] Page ${page}: ${successes} synced.`, 'success');
    }

    return successes;
}

async function syncAll(options = {}) {
    if (isRunning) {
        console.log('Sync is already running. Skipping.');
        return;
    }
    isRunning = true;

    try {
        const isFull = options.full || false;
        const fromPage = parseInt(options.fromPage) || 1;
        // If 'pages' is provided (from old UI), use it to determine toPage. 
        // Otherwise use fromPage -> toPage range from new UI.
        let toPage;
        if (options.toPage) {
            toPage = parseInt(options.toPage);
        } else if (options.pages) {
            toPage = fromPage + parseInt(options.pages) - 1;
        } else {
            toPage = isFull ? 500 : fromPage;
        }

        addLog(`Starting Sync. Mode: ${isFull ? 'FULL CRAWL' : 'UPDATE'} (Pages: ${fromPage} - ${toPage})`, 'info');
        console.log(`Starting Sync. Mode: ${isFull ? 'FULL CRAWL' : 'UPDATE'} (Pages: ${fromPage} - ${toPage})`);

        let totalProcessed = 0;

        // Loop through pages
        for (let page = fromPage; page <= toPage; page++) {
            currentPage = page;
            if (!isRunning) break;

            // Sequential adapters per page to be gentle
            // Order: OPHIM -> NGUONC -> KKPHIM
            // This ensures KKPHIM (Priority 1) metadata overwrites others if they exist
            const countOP = await syncPage(ADAPTERS.OPHIM, page);
            const countNC = await syncPage(ADAPTERS.NGUONC, page);
            const countKK = await syncPage(ADAPTERS.KKPHIM, page);

            totalProcessed += (countOP + countKK + countNC);

            // Small break between pages
            if (isFull || (toPage - fromPage > 1)) await sleep(1000);
        }

        console.log(`Sync Completed. Total movies processed: ${totalProcessed}`);
        return totalProcessed;
    } finally {
        isRunning = false;
        currentPage = 1;
    }
}

// Log Buffer
const logBuffer = [];
const MAX_LOGS = 100;

const addLog = (message, type = 'info') => {
    const log = {
        time: new Date(),
        message,
        type
    };
    logBuffer.unshift(log); // Add to beginning
    if (logBuffer.length > MAX_LOGS) logBuffer.pop();
};

const getLogs = () => logBuffer;

const setupCrawler = () => {
    console.log('Crawler: Manual Mode Only (Auto-run moved to GitHub Actions).');
};

const startCrawl = async (options) => {
    if (isRunning) return { success: false, message: 'Crawler is already running' };

    // Run in background
    syncAll(options).then(() => {
        addLog('Crawl finished', 'success');
    }).catch(err => {
        addLog(`Crawl failed: ${err.message}`, 'error');
    });

    return { success: true, message: 'Crawler started in background' };
};

const stopCrawl = () => {
    stopSync();
    addLog('Crawler stopped by user', 'warning');
    return { success: true, message: 'Stopping crawler...' };
};

// Sync a specific movie by slug from all sources
async function syncSpecificMovie(slug, sourceName = null) {
    try {
        console.log(`[FETCH-SPECIFIC] Attempting to fetch movie: ${slug} from ${sourceName || 'all sources'}`);

        // IMPORTANT: Clear from blacklist if explicitly requested
        if (blacklist.has(slug)) {
            console.log(`[FETCH-SPECIFIC] Removing ${slug} from blacklist for explicit sync.`);
            blacklist.delete(slug);
        }

        let results = [];

        // If specific source is provided, try only that source
        if (sourceName) {
            const adapter = ADAPTERS[sourceName.toUpperCase()];
            if (!adapter) {
                return { success: false, error: `Nguồn '${sourceName}' không hợp lệ. Chọn: OPHIM, KKPHIM, NGUONC` };
            }
            const result = await processMovie(adapter, slug);
            if (result.success) {
                return { ...result, source: adapter.name };
            }
            return result;
        }

        // Try all sources in priority order: KKPHIM -> NGUONC -> OPHIM
        const sources = [ADAPTERS.KKPHIM, ADAPTERS.NGUONC, ADAPTERS.OPHIM];

        for (const adapter of sources) {
            console.log(`[FETCH-SPECIFIC] Trying ${adapter.name}...`);
            const result = await processMovie(adapter, slug, 0);

            if (result.success) {
                console.log(`[FETCH-SPECIFIC] ✓ Successfully fetched from ${adapter.name}: ${result.name}`);
                return { success: true, source: adapter.name, movie: result };
            }

            // Small delay between attempts
            await sleep(500);
        }

        console.log(`[FETCH-SPECIFIC] ✗ Failed to fetch ${slug} from all sources`);
        return { success: false, error: 'Không tìm thấy phim từ bất kỳ nguồn nào (OPHIM, KKPHIM, NGUONC)' };

    } catch (error) {
        console.error(`[FETCH-SPECIFIC] Error:`, error);
        return { success: false, error: error.message };
    }
}

// Search for movies by name from all sources
async function searchMovieByName(searchQuery, source = 'ALL') {
    try {
        console.log(`[SEARCH] Searching for: ${searchQuery} in ${source || 'ALL'}`);

        if (!source || source.toUpperCase() === 'ALL') {
            // Search all sources
            const promises = Object.values(ADAPTERS)
                .filter(adapter => adapter.search)
                .map(adapter => adapter.search(searchQuery));

            const results = await Promise.allSettled(promises);
            let combined = [];

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    combined = combined.concat(result.value);
                }
            });

            if (combined.length === 0) {
                return { success: false, error: 'Không tìm thấy phim phù hợp ở bất kỳ nguồn nào' };
            }

            // Optional: Remove exact duplicates by slug if same slug exists across sources
            return { success: true, results: combined };
        }

        // Search specific source
        const adapter = ADAPTERS[source.toUpperCase()];
        if (!adapter || !adapter.search) {
            return { success: false, error: 'Nguồn không hợp lệ hoặc không hỗ trợ tìm kiếm' };
        }

        const matches = await adapter.search(searchQuery);

        if (!matches || matches.length === 0) {
            return { success: false, error: 'Không tìm thấy phim phù hợp' };
        }

        return {
            success: true,
            results: matches
        };

    } catch (error) {
        console.error(`[SEARCH] Error:`, error);
        return { success: false, error: error.message };
    }
}

const addToBlacklist = (slug) => blacklist.add(slug);
const removeFromBlacklist = (slug) => blacklist.delete(slug);
const getBlacklist = () => Array.from(blacklist);
const getStatus = () => ({ isRunning, blacklistSize: blacklist.size, currentPage });

// Process pending movie requests from database
async function processPendingRequests() {
    try {
        const MovieRequest = require('./models/MovieRequest');
        const Notification = require('./models/Notification');

        // Get all pending requests sorted by priority
        const pendingRequests = await MovieRequest.find({
            status: 'pending'
        })
            .sort({ priority: -1, createdAt: 1 }) // Higher priority first, then oldest
            .limit(50) // Process max 50 requests per run
            .populate('userId', 'displayName');

        if (pendingRequests.length === 0) {
            console.log('[REQUESTS] No pending requests to process');
            return { processed: 0, successful: 0, failed: 0 };
        }

        console.log(`[REQUESTS] Found ${pendingRequests.length} pending requests. Processing...`);

        let successful = 0;
        let failed = 0;

        for (const request of pendingRequests) {
            try {
                // Update to processing
                request.status = 'processing';
                await request.save();

                let slug = request.movieSlug;

                // Auto-generate slug if not provided
                if (!slug && request.movieName) {
                    slug = request.movieName
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/[^a-z0-9\s-]/g, '')
                        .trim()
                        .replace(/\s+/g, '-');
                }

                if (!slug) {
                    throw new Error('Không có slug để tìm phim');
                }

                console.log(`[REQUESTS] Processing: ${request.movieName} (${slug})`);

                // Try to fetch from all sources
                const result = await syncSpecificMovie(slug, null);

                if (result.success) {
                    // Mark as completed
                    request.status = 'completed';
                    request.processedAt = new Date();
                    request.movieSlug = slug;
                    await request.save();

                    // Send notifications to all users who requested this movie
                    const allRequests = await MovieRequest.find({
                        movieSlug: slug,
                        status: 'completed'
                    }).populate('userId');

                    const userIdsToNotify = Array.from(new Set(allRequests
                        .filter(req => req.userId && req.userId._id)
                        .map(req => req.userId._id.toString())));

                    if (userIdsToNotify.length > 0) {
                        const { sendToMultiple } = require('./utils/notificationService');
                        await sendToMultiple(userIdsToNotify, {
                            title: '🎬 Phim yêu cầu đã có!',
                            content: `Phim "${request.movieName || 'bạn yêu cầu'}" đã có sẵn! Xem ngay`,
                            link: `/movie/${slug}`,
                            type: 'movie_request',
                            icon: '/logo.png'
                        });
                        console.log(`[REQUESTS] ✓ Sent ${userIdsToNotify.length} notifications for ${request.movieName}`);
                    }

                    successful++;
                    console.log(`[REQUESTS] ✓ Success: ${request.movieName} from ${result.source}`);
                } else {
                    throw new Error(result.error || 'Không thể tải phim từ bất kỳ nguồn nào');
                }

            } catch (error) {
                // Mark as failed
                request.status = 'failed';
                request.errorMessage = error.message;
                request.processedAt = new Date();
                await request.save();

                failed++;
                console.error(`[REQUESTS] ✗ Failed: ${request.movieName} - ${error.message}`);
            }

            // Small delay between requests
            await sleep(1000);
        }

        console.log(`[REQUESTS] Completed: ${successful} successful, ${failed} failed`);
        return { processed: pendingRequests.length, successful, failed };

    } catch (error) {
        console.error('[REQUESTS] Error processing pending requests:', error);
        return { processed: 0, successful: 0, failed: 0 };
    }
}

const stopSync = () => {
    isRunning = false;
    console.log('Sync manually stopped by admin.');
};

module.exports = {
    setupCrawler,
    syncAll,
    syncSpecificMovie,
    searchMovieByName,
    processPendingRequests,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist,
    stopSync,
    getLogs,
    startCrawl,
    stopCrawl
};
