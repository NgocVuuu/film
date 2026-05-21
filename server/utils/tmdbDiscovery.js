const axios = require('axios');

class TmdbDiscovery {
    constructor() {
        this.apiKey = process.env.TMDB_API_KEY;
        this.baseUrl = 'https://api.themoviedb.org/3';
        if (!this.apiKey) {
            console.error('[TMDB] Missing TMDB_API_KEY in environment variables.');
        }
    }

    /**
     * Fetch trending TV shows from TMDB filtering by origin country (KR, CN)
     * @param {number} page Page number
     * @returns {Promise<Array>} List of shows
     */
    async getTrendingAsianDramas(page = 1) {
        try {
            // Using discover/tv to filter by original_language or with_origin_country
            // with_origin_country: KR (South Korea), CN (China)
            const response = await axios.get(`${this.baseUrl}/discover/tv`, {
                params: {
                    api_key: this.apiKey,
                    language: 'vi-VN',
                    sort_by: 'popularity.desc',
                    with_origin_country: 'KR|CN',
                    page: page,
                    // Optional: Only shows that aired recently
                    'air_date.gte': this.getNDaysAgo(30),
                }
            });

            return response.data.results || [];
        } catch (error) {
            console.error('[TMDB] Error fetching trending dramas:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Fetch trending Movies from TMDB filtering by origin country (KR, CN)
     * @param {number} page Page number
     * @returns {Promise<Array>} List of movies
     */
     async getTrendingAsianMovies(page = 1) {
        try {
            const response = await axios.get(`${this.baseUrl}/discover/movie`, {
                params: {
                    api_key: this.apiKey,
                    language: 'vi-VN',
                    sort_by: 'popularity.desc',
                    with_origin_country: 'KR|CN',
                    page: page,
                    'primary_release_date.gte': this.getNDaysAgo(60),
                }
            });

            return response.data.results || [];
        } catch (error) {
            console.error('[TMDB] Error fetching trending movies:', error.response?.data || error.message);
            return [];
        }
    }

    // Helper to get YYYY-MM-DD for N days ago
    getNDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }
}

module.exports = new TmdbDiscovery();
