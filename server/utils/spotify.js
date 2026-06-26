const axios = require('axios');

// Spotify credentials from .env
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpirationTime = null;

/**
 * Lấy Access Token từ Spotify (Client Credentials Flow)
 */
async function getAccessToken() {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        return null;
    }

    // Nếu token vẫn còn hạn, dùng lại token cũ
    if (accessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
        return accessToken;
    }

    try {
        const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials', 
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (response.data && response.data.access_token) {
            accessToken = response.data.access_token;
            // Trừ hao 5 phút (300 giây) để đảm bảo token không bị hết hạn giữa chừng
            tokenExpirationTime = Date.now() + (response.data.expires_in - 300) * 1000;
            return accessToken;
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi lấy Spotify Access Token:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Tìm kiếm Album/Playlist OST trên Spotify
 * @param {string} movieName Tên phim (Tên gốc hoặc tiếng Anh)
 * @returns {object|null} { id, type } của OST tìm được
 */
async function searchOST(movieName) {
    if (!movieName) return null;

    const token = await getAccessToken();
    if (!token) {
        console.log('[SPOTIFY] Thiếu token hoặc chưa config Client ID/Secret.');
        return null;
    }

    try {
        // Tìm kiếm kết hợp từ khóa OST và Soundtrack
        // Ưu tiên album trước (chính thống), nếu không có mới lấy playlist
        const query = encodeURIComponent(`${movieName} OST`);
        const query2 = encodeURIComponent(`${movieName} Original Soundtrack`);
        
        const url = `https://api.spotify.com/v1/search?q=${query}&type=album,playlist&limit=3`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = response.data;

        // Ưu tiên lấy Album (thường là official)
        if (data.albums && data.albums.items && data.albums.items.length > 0) {
            // Lọc ra album nào có tên tương đồng với tên phim nhất để tránh kết quả rác
            const album = data.albums.items[0]; 
            return {
                id: album.id,
                type: 'album'
            };
        }

        // Nếu không có Album, lấy Playlist có nhiều follow nhất (do fan tổng hợp)
        if (data.playlists && data.playlists.items && data.playlists.items.length > 0) {
            const playlist = data.playlists.items[0];
            return {
                id: playlist.id,
                type: 'playlist'
            };
        }

        return null;
    } catch (error) {
        console.error(`[SPOTIFY] Lỗi tìm kiếm OST cho phim "${movieName}":`, error.response?.data || error.message);
        return null;
    }
}

module.exports = {
    searchOST
};
