const axios = require('axios');
const Movie = require('../models/Movie');
const { attachProgressToMovies } = require('../utils/movieUtils');

// Hybrid Search: DB first, then ophim API
exports.hybridSearch = async (req, res) => {
    try {
        const keyword = req.query.q;
        if (!keyword) return res.json({ success: true, data: [], source: 'none' });

        // 1. Search in local DB first
        let localMovies = await Movie.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { origin_name: { $regex: keyword, $options: 'i' } }
            ]
        }).limit(20).select('name slug thumb_url origin_name year type quality episode_current');

        // If found in DB, return immediately
        if (localMovies.length > 0) {
            // Attach progress if logged in
            if (req.user) {
                localMovies = await attachProgressToMovies(localMovies, req.user._id);
            }

            return res.json({
                success: true,
                data: localMovies,
                source: 'local',
                total: localMovies.length
            });
        }

        // 2. If not found, search ophim API
        try {
            const ophimResponse = await axios.get(`https://ophim1.com/v1/api/tim-kiem`, {
                params: { keyword },
                timeout: 5000
            });

            if (ophimResponse.data.status === 'success' && ophimResponse.data.data.items) {
                const ophimMovies = ophimResponse.data.data.items.map((movie) => ({
                    _id: movie._id,
                    name: movie.name,
                    slug: movie.slug,
                    origin_name: movie.origin_name,
                    thumb_url: movie.thumb_url,
                    poster_url: movie.poster_url,
                    year: movie.year,
                    type: movie.type,
                    quality: movie.quality,
                    year: movie.year,
                    type: movie.type,
                    quality: movie.quality,
                    episode_current: movie.episode_current,
                    fromOphim: true // Flag to indicate it's from ophim
                }));

                // Background save to DB (don't wait)
                setImmediate(() => {
                    ophimMovies.forEach(async (movie) => {
                        try {
                            // Fetch full details and save
                            const detailResponse = await axios.get(`https://ophim1.com/phim/${movie.slug}`);
                            if (detailResponse.data.status === 'success') {
                                const fullMovie = detailResponse.data.movie;
                                await Movie.findOneAndUpdate(
                                    { slug: fullMovie.slug },
                                    { $set: fullMovie },
                                    { upsert: true, new: true }
                                );
                                console.log(`[HYBRID] Saved movie: ${fullMovie.name}`);
                            }
                        } catch (err) {
                            console.error(`[HYBRID] Error saving ${movie.name}:`, err.message);
                        }
                    });
                });

                // Attaching progress probably won't find anything for new movies from API, but we try anyway if they exist in our DB by chance
                let finalMovies = ophimMovies;
                if (req.user) {
                    // Since these objects might not be full Mongoose docs or might not be in DB yet, 
                    // attachProgressToMovies might rely on DB. 
                    // But attachProgressToMovies queries WatchProgress by 'movieSlug', so it WILL work if we have progress recorded!
                    finalMovies = await attachProgressToMovies(ophimMovies, req.user._id);
                }

                return res.json({
                    success: true,
                    data: finalMovies,
                    source: 'ophim',
                    total: ophimMovies.length,
                    message: 'Kết quả từ nguồn bên ngoài, đang lưu vào hệ thống...'
                });
            }
        } catch (ophimError) {
            console.error('Ophim API error:', ophimError.message);
        }

        // 3. No results from both sources
        return res.json({
            success: true,
            data: [],
            source: 'none',
            total: 0,
            message: 'Không tìm thấy phim nào'
        });

    } catch (err) {
        console.error('Hybrid search error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
