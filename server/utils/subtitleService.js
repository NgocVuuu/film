const axios = require('axios');
const qs = require('qs');

class SubtitleService {
    constructor() {
        this.apiKey = process.env.OPENSUBTITLES_API_KEY;
        this.userAgent = process.env.OPENSUBTITLES_USER_AGENT || 'AntigravityFilmApp v1.0';
        this.apiUrl = 'https://api.opensubtitles.com/api/v1';
    }

    async searchVietnameseSubtitles(movieName, year, imdbId = null) {
        try {
            if (!this.apiKey) {
                console.warn('OPENSUBTITLES_API_KEY is not set. Subtitle search will be limited or mocked.');
                // For demonstration purposes, if no API key is set, we return an empty array or a mock
                return [];
            }

            const params = {
                languages: 'vi',
                query: movieName,
                type: 'movie'
            };

            if (year) params.year = year;
            if (imdbId) params.imdb_id = imdbId;

            const response = await axios.get(`${this.apiUrl}/subtitles`, {
                params,
                headers: {
                    'Api-Key': this.apiKey,
                    'User-Agent': this.userAgent,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.data) {
                return response.data.data.map(item => ({
                    id: item.id,
                    lang: 'vi',
                    label: `Tiếng Việt - ${item.attributes.release}`,
                    url: item.attributes.files[0].file_id, // This is a file ID, needs another call to get download link
                    file_id: item.attributes.files[0].file_id,
                    provider: 'OpenSubtitles'
                }));
            }

            return [];
        } catch (error) {
            console.error('Error searching subtitles:', error.response?.data || error.message);
            return [];
        }
    }

    async getDownloadLink(fileId) {
        try {
            if (!this.apiKey) return null;

            const response = await axios.post(`${this.apiUrl}/download`,
                { file_id: fileId },
                {
                    headers: {
                        'Api-Key': this.apiKey,
                        'User-Agent': this.userAgent,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data?.link || null;
        } catch (error) {
            console.error('Error getting download link:', error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = new SubtitleService();
