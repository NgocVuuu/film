const WatchProgress = require('../models/WatchProgress');

/**
 * Attaches watch progress to a list of movies or a single movie object.
 * @param {Array|Object} movies - Single movie object or array of movie objects
 * @param {String} userId - The user's ID
 * @returns {Promise<Array|Object>} - Movies with 'progress' property attached
 */
const attachProgressToMovies = async (movies, userId) => {
    if (!userId || !movies) return movies;

    const isArray = Array.isArray(movies);
    const movieList = isArray ? movies : [movies];

    if (movieList.length === 0) return movies;

    try {
        const movieSlugs = movieList.map(m => m.slug);
        const progresses = await WatchProgress.find({
            userId,
            movieSlug: { $in: movieSlugs }
        });

        const progressMap = {};
        progresses.forEach(p => {
            // Calculate percentage if duration > 0, else 0
            const percentage = p.duration > 0 ? Math.round((p.currentTime / p.duration) * 100) : 0;
            progressMap[p.movieSlug] = {
                currentTime: p.currentTime,
                duration: p.duration,
                percentage,
                episodeSlug: p.episodeSlug,
                episodeName: p.episodeName
            };
        });

        const result = movieList.map(movie => {
            const movieObj = movie.toObject ? movie.toObject() : movie;
            if (progressMap[movie.slug]) {
                movieObj.progress = progressMap[movie.slug];
            }
            return movieObj;
        });

        return isArray ? result : result[0];
    } catch (error) {
        console.error('Error attaching progress:', error);
        return movies;
    }
};

module.exports = { attachProgressToMovies };
