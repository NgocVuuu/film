const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 1. Search for movie or tv show
async function searchTMDB(query, type = 'movie', year = null) {
  try {
    if (!TMDB_API_KEY) return null;
    let url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=vi-VN`;
    if (year) {
      if (type === 'movie') url += `&primary_release_year=${year}`;
      else url += `&first_air_date_year=${year}`;
    }
    const response = await axios.get(url);
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0]; // Trả về kết quả đầu tiên
    }
    return null;
  } catch (error) {
    console.error(`Lỗi searchTMDB (${query}):`, error.message);
    return null;
  }
}

// 2. Lấy danh sách diễn viên của một bộ phim
async function getMovieCredits(tmdb_id, type = 'movie') {
  try {
    if (!TMDB_API_KEY) return [];
    const url = `${TMDB_BASE_URL}/${type}/${tmdb_id}/credits?api_key=${TMDB_API_KEY}&language=vi-VN`;
    const response = await axios.get(url);
    if (response.data && response.data.cast) {
      // Lọc ra top 15 diễn viên
      return response.data.cast.slice(0, 15).map(actor => ({
        tmdb_id: actor.id,
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path
      }));
    }
    return [];
  } catch (error) {
    console.error(`Lỗi getMovieCredits (${tmdb_id}):`, error.message);
    return [];
  }
}

// 3. Hàm tổng hợp để tự động lấy cast cho 1 phim
async function syncMovieCast(movieName, originName, type, year) {
  try {
    let tmdbType = type === 'series' || type === 'tvshows' ? 'tv' : 'movie';
    let tmdbMovie = null;
    
    // Ưu tiên tìm bằng tên gốc (thường chuẩn hơn)
    if (originName) {
      tmdbMovie = await searchTMDB(originName, tmdbType, year);
    }
    
    // Nếu không ra, tìm bằng tên việt
    if (!tmdbMovie && movieName) {
      tmdbMovie = await searchTMDB(movieName, tmdbType, year);
    }
    
    // Nếu vẫn không ra, bỏ year đi tìm lại
    if (!tmdbMovie && originName && year) {
      tmdbMovie = await searchTMDB(originName, tmdbType, null);
    }
    
    if (tmdbMovie) {
      const cast = await getMovieCredits(tmdbMovie.id, tmdbType);
      return {
        tmdb_id: tmdbMovie.id,
        tmdb_type: tmdbType,
        cast: cast
      };
    }
    
    return null;
  } catch (error) {
    console.error('Lỗi syncMovieCast:', error.message);
    return null;
  }
}

// 4. Lấy chi tiết một diễn viên
async function getPersonDetails(tmdb_id) {
  try {
    if (!TMDB_API_KEY) return null;
    const url = `${TMDB_BASE_URL}/person/${tmdb_id}?api_key=${TMDB_API_KEY}&language=vi-VN`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Lỗi getPersonDetails (${tmdb_id}):`, error.message);
    return null;
  }
}

// 5. Hàm merge tên diễn viên thuần việt từ DB local vào dữ liệu TMDB
function mergeActors(localActors, tmdbActors) {
  if (!localActors || localActors.length === 0) return tmdbActors;
  
  const localLower = localActors.map(a => a.trim().toLowerCase());
  const tmdbLower = tmdbActors.map(a => a.name.trim().toLowerCase());
  
  for (let i = 0; i < tmdbActors.length; i++) {
      const tmdbName = tmdbLower[i];
      
      // Nếu tên TMDB đã có sẵn trong mảng local (đã được việt hoá), thì bỏ qua
      if (localLower.includes(tmdbName)) {
          continue;
      }
      
      // Nếu tên TMDB chưa được việt hoá (VD: tiếng Trung, Anh)
      // Thử lấy tên ở cùng vị trí trong mảng local
      if (i < localActors.length) {
          const localNameAtI = localLower[i];
          // Nếu tên local này chưa xuất hiện ở đâu trong TMDB, thì đích thị nó là bản dịch của diễn viên này
          if (!tmdbLower.includes(localNameAtI)) {
              tmdbActors[i].name = localActors[i].trim();
          }
      }
  }
  
  return tmdbActors;
}

async function searchPerson(name) {
  try {
    if (!TMDB_API_KEY) return null;
    const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&language=vi-VN`;
    const response = await axios.get(url);
    if (response.data && response.data.results && response.data.results.length > 0) {
      // Fetch detailed info of the first match
      return await getPersonDetails(response.data.results[0].id);
    }
    return null;
  } catch (error) {
    console.error(`Lỗi searchPerson (${name}):`, error.message);
    return null;
  }
}

// 6. Lấy danh sách ảnh của một phim (Backdrops & Posters)
async function getMovieImages(tmdb_id, type = 'movie') {
  try {
    if (!TMDB_API_KEY) return [];
    // Ngôn ngữ mặc định không truyền để lấy ảnh gốc (chất lượng cao và không text/text tiếng anh)
    const url = `${TMDB_BASE_URL}/${type}/${tmdb_id}/images?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    if (response.data) {
      // Ưu tiên lấy backdrops trước, sau đó là posters
      const backdrops = (response.data.backdrops || []).map(img => img.file_path);
      const posters = (response.data.posters || []).map(img => img.file_path);
      
      // Lấy tối đa 10 backdrops và 5 posters để không làm nặng payload
      const topBackdrops = backdrops.slice(0, 10);
      const topPosters = posters.slice(0, 5);
      
      // Nối mảng lại, backdrops trước
      return [...topBackdrops, ...topPosters];
    }
    return [];
  } catch (error) {
    console.error(`Lỗi getMovieImages (${tmdb_id}):`, error.message);
    return [];
  }
}

// 7. Lấy danh sách trailer của một phim
async function getMovieTrailers(tmdb_id, type = 'movie') {
  try {
    if (!TMDB_API_KEY) return null;
    const url = `${TMDB_BASE_URL}/${type}/${tmdb_id}/videos?api_key=${TMDB_API_KEY}&language=vi-VN`;
    let response = await axios.get(url);
    
    // Nếu vi-VN không có trailer, fallback về tiếng Anh (en-US)
    if (!response.data || !response.data.results || response.data.results.length === 0) {
      const urlEn = `${TMDB_BASE_URL}/${type}/${tmdb_id}/videos?api_key=${TMDB_API_KEY}`;
      response = await axios.get(urlEn);
    }

    if (response.data && response.data.results && response.data.results.length > 0) {
      // Ưu tiên tìm Trailer từ YouTube
      const trailers = response.data.results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
      if (trailers.length > 0) {
        return `https://www.youtube.com/watch?v=${trailers[0].key}`;
      }
      
      // Nếu không có Trailer, lấy đại một video Youtube đầu tiên (có thể là Teaser)
      const ytVideos = response.data.results.filter(v => v.site === 'YouTube');
      if (ytVideos.length > 0) {
        return `https://www.youtube.com/watch?v=${ytVideos[0].key}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`Lỗi getMovieTrailers (${tmdb_id}):`, error.message);
    return null;
  }
}

module.exports = {
  searchTMDB,
  getMovieCredits,
  syncMovieCast,
  getPersonDetails,
  searchPerson,
  mergeActors,
  getMovieImages,
  getMovieTrailers
};
