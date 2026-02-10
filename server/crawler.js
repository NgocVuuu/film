const axios = require('axios');
const cron = require('node-cron');
const Movie = require('./models/Movie');
const Favorite = require('./models/Favorite');
const Notification = require('./models/Notification');

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
                const episodes = res.data.data.item.episodes || [];
                return { movie, episodes };
            } catch (e) { return null; }
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
                const episodes = res.data.episodes || [];
                return { movie, episodes };
            } catch (e) { return null; }
        },
        processImage: (path) => path
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
                    server_name: server.server_name,
                    server_data: server.items.map(item => ({
                        name: item.name,
                        slug: item.slug,
                        link_m3u8: item.m3u8,
                        link_embed: item.embed,
                        filename: item.name
                    }))
                }));

                const normalizedMovie = {
                    ...movie,
                    origin_name: movie.original_name,
                    thumb_url: movie.thumb_url,
                    poster_url: movie.poster_url,
                    year: movie.year || new Date().getFullYear()
                };

                return { movie: normalizedMovie, episodes };
            } catch (e) {
                return null;
            }
        },
        processImage: (path) => path
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
            updatedAt: new Date(movie.modified?.time || Date.now())
        };

        const existingMovie = await Movie.findOne({ slug: slug });
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
                if (name.startsWith('KK -')) return 3;
                if (name.startsWith('NC -')) return 2;
                if (name.startsWith('OP -')) return 1;
                return 0;
            };
            return getScore(b.server_name) - getScore(a.server_name);
        });

        // Check for new episodes to notify
        if (existingMovie) {
            const oldEpCount = existingMovie.episodes ? existingMovie.episodes.reduce((acc, cur) => acc + (cur.server_data ? cur.server_data.length : 0), 0) : 0;
            const newEpCount = finalEpisodes.reduce((acc, cur) => acc + (cur.server_data ? cur.server_data.length : 0), 0);

            // Notify if episode count increased AND it's not a fresh crawl of same content (naive check)
            // Better: Check if episode_current changed string
            if (newEpCount > oldEpCount || (existingMovie.episode_current !== movie.episode_current && movie.episode_current !== 'Full')) {
                // Find users to notify
                const favorites = await Favorite.find({ movieSlug: slug });
                if (favorites.length > 0) {
                    const notifications = favorites.map(fav => ({
                        recipient: fav.user,
                        content: `Phim ${movie.name} vừa cập nhật tập mới (${movie.episode_current})!`,
                        link: `/movie/${slug}`,
                        type: 'episode',
                        isRead: false
                    }));
                    await Notification.insertMany(notifications);
                    console.log(`[NOTIFY] Sent ${notifications.length} notifications for ${slug} (${movie.name})`);
                }
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
        console.warn(`[${adapter.name}] Page ${page}: ${successes} synced, ${failures} failed.`);
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
        // If full crawl, go up to 500 pages, else just page 1
        const maxPages = isFull ? 500 : 1;

        console.log(`Starting Sync. Mode: ${isFull ? 'FULL CRAWL' : 'UPDATE'} (Max Pages: ${maxPages})`);

        let totalProcessed = 0;

        // Loop through pages
        for (let page = 1; page <= maxPages; page++) {
            currentPage = page;
            if (!isRunning) break;

            // Sequential adapters per page to be gentle
            // Order: OPHIM -> NGUONC -> KKPHIM
            // This ensures KKPHIM (Priority 1) metadata overwrites others if they exist
            const countOP = await syncPage(ADAPTERS.OPHIM, page);
            const countNC = await syncPage(ADAPTERS.NGUONC, page);
            const countKK = await syncPage(ADAPTERS.KKPHIM, page);

            totalProcessed += (countOP + countKK + countNC);

            // ... (rest of loop)

            // If all adapters return 0 movies for this page, maybe we reached the end?
            // But some API might have gaps, so better to rely on known total pages or just hard limit.
            // For now, hard limit of 500 is safe enough.

            // Small break between pages
            if (isFull) await sleep(1000);
        }

        console.log(`Sync Completed. Total movies processed: ${totalProcessed}`);
        return totalProcessed;
    } finally {
        isRunning = false;
        currentPage = 1;
    }
}

const setupCrawler = () => {
    // Cron moved to GitHub Actions to save resources
    // cron.schedule('*/30 * * * *', () => {
    //     syncAll({ full: false });
    // });
    console.log('Crawler: Manual Mode Only (Auto-run moved to GitHub Actions).');
};

const addToBlacklist = (slug) => blacklist.add(slug);
const removeFromBlacklist = (slug) => blacklist.delete(slug);
const getBlacklist = () => Array.from(blacklist);
const getStatus = () => ({ isRunning, blacklistSize: blacklist.size, currentPage });

module.exports = {
    setupCrawler,
    syncAll,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist,
    getStatus
};
