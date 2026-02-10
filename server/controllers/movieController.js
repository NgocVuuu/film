const Movie = require('../models/Movie');

// 1. Get Home Data (Aggregated)
const getHomeData = async (req, res) => {
    try {
        const [
            featuredMovies,
            latestMovies,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies
        ] = await Promise.all([
            // Featured (Top 10 Latest for now, or could be a specific 'featured' flag)
            Movie.find({}).sort({ updatedAt: -1 }).limit(10).select('-content -episodes -director -actor'),

            // Latest (Top 15)
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
            Movie.find({ 'category.slug': 'gia-dinh' }).sort({ updatedAt: -1 }).limit(15).select('-content -episodes -director -actor')
        ]);

        res.json({
            success: true,
            data: {
                featuredMovies,
                latestMovies,
                chinaMovies,
                koreaMovies,
                usukMovies,
                cartoonMovies,
                horrorMovies,
                familyMovies
            }
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

        // Filter conditions
        const query = {};
        if (req.query.type) {
            query.type = req.query.type; // 'single', 'series', 'hoathinh', 'tvshows'
        }
        if (req.query.category) {
            query['category.slug'] = req.query.category;
        }
        if (req.query.country) {
            query['country.slug'] = req.query.country;
        }
        if (req.query.year) {
            query.year = parseInt(req.query.year);
        }
        if (req.query.actor) {
            // Case-insensitive regex match for actor name
            query.actor = { $regex: req.query.actor, $options: 'i' };
        }

        const movies = await Movie.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-content -episodes -director -actor'); // Light selection

        const total = await Movie.countDocuments(query);

        res.json({
            success: true,
            data: movies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Get Movie Detail
const getMovieDetail = async (req, res) => {
    try {
        const movie = await Movie.findOne({ slug: req.params.slug });
        if (!movie) return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });

        // Get related movies (same category)
        const related = await Movie.find({
            'category.slug': { $in: movie.category.map(c => c.slug) },
            slug: { $ne: movie.slug }
        }).limit(6).select('name slug thumb_url year');

        res.json({ success: true, data: movie, related });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getHomeData,
    getMovies,
    getMovieDetail
};
