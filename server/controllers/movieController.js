const Movie = require('../models/Movie');
const mongoose = require('mongoose');

const { attachProgressToMovies } = require('../utils/movieUtils');

// 1. Get Home Data (Aggregated)
const getHomeData = async (req, res) => {
    try {
        const [
            trendingMovies, // New Trending
            featuredMovies,
            latestMovies,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            thailandMovies, // New
            japanMovies,    // New
            actionMovies,   // New
            romanceMovies   // New
        ] = await Promise.all([
            // Trending: Highest Views
            Movie.find({}).sort({ view: -1 }).limit(10).select('-content -episodes -director -actor'),
            // Featured
            Movie.find({}).sort({ updatedAt: -1 }).limit(10).select('-content -episodes -director -actor'),
            // Latest
            Movie.find({}).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // China
            Movie.find({ 'country.slug': 'trung-quoc' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Korea
            Movie.find({ 'country.slug': 'han-quoc' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // US/UK
            Movie.find({ 'country.slug': { $in: ['au-my', 'anh', 'my'] } }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Cartoon
            Movie.find({ type: 'hoathinh' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Horror
            Movie.find({ 'category.slug': 'kinh-di' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Family
            Movie.find({ 'category.slug': 'gia-dinh' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Thailand
            Movie.find({ 'country.slug': 'thai-lan' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Japan
            Movie.find({ 'country.slug': 'nhat-ban' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Action
            Movie.find({ 'category.slug': 'hanh-dong' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
            // Romance
            Movie.find({ 'category.slug': 'tinh-cam' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor'),
        ]);

        let responseData = {
            trendingMovies,
            featuredMovies,
            latestMovies,
            chinaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            koreaMovies,      // Was missing in original responseData construction? checking... yes it was missing in line 43-47 range, added here
            thailandMovies,
            japanMovies,
            actionMovies,
            romanceMovies
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
                    { $match: { userId: req.user._id } },
                    { $sort: { updatedAt: -1 } },
                    {
                        $group: {
                            _id: "$movieSlug",
                            doc: { $first: "$$ROOT" }
                        }
                    },
                    { $replaceRoot: { newRoot: "$doc" } },
                    { $sort: { updatedAt: -1 } },
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
        const { category, country, year, status, sort, type, chieurap, q } = req.query;
        let query = {};

        // Text search (if 'q' is present)
        if (q) {
            query.$text = { $search: q };
        }

        if (category) query['category.slug'] = category;
        if (country) query['country.slug'] = country;
        if (year) query.year = parseInt(year);
        if (status) query.status = status; // 'completed' | 'ongoing'
        if (type) query.type = type; // 'series' | 'single' | 'hoathinh' | 'tvshows'
        if (chieurap === 'true') query.chieurap = true;

        // Sorting
        let sortOption = { updatedAt: -1 }; // Default: Newest update
        if (sort === 'newest') sortOption = { year: -1, updatedAt: -1 }; // Release year
        if (sort === 'view') sortOption = { view: -1 };
        if (sort === 'rating') sortOption = { rating_average: -1 };

        const movies = await Movie.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .select('name slug thumb_url origin_name year type quality episode_current view rating_average');

        const total = await Movie.countDocuments(query);

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
        const movie = await Movie.findOne({ slug: req.params.slug });
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
