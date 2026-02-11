const NodeCache = require('node-cache');

// StdTTL: the default time-to-live for each cache entry in seconds (e.g. 300s = 5mins)
// Checkperiod: frequency of checking for expired keys
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in seconds (optional, defaults to stdTTL)
 */
const cacheMiddleware = (duration) => (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    // Generate a unique key based on the request URL and user
    // For logged-in users: include userId to cache separately with their progress
    // For guests: use 'guest' to share cache among all non-authenticated users
    const baseKey = req.originalUrl || req.url;
    const userId = req.user?._id?.toString() || 'guest';
    const key = `${baseKey}-${userId}`;

    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        // console.log(`[CACHE HIT] ${key}`);
        return res.json(cachedResponse);
    }

    // console.log(`[CACHE MISS] ${key}`);

    // Override res.json to store the response in cache before sending it
    const originalSend = res.json;

    res.json = (body) => {
        if (displayCacheLog(res.statusCode)) {
            cache.set(key, body, duration);
        }
        originalSend.call(res, body);
    };

    next();
};

// Helper to decide what to cache (e.g. only 200 OK responses)
function displayCacheLog(statusCode) {
    return statusCode >= 200 && statusCode < 300;
}

// Export the middleware and the cache instance (if we need to clear it manually)
module.exports = {
    cacheMiddleware,
    cache
};
