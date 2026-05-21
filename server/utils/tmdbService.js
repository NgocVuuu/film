const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

function normalize(s) {
  return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

async function searchSeries(query) {
  if (!TMDB_API_KEY) return null;
  try {
    const q = query;
    const res = await axios.get(`${TMDB_BASE}/search/tv`, { params: { api_key: TMDB_API_KEY, query: q, page: 1 } });
    const results = res.data.results || [];
    if (!results.length) return null;

    const nq = normalize(query);
    // Simple scoring: exact title (orig or name) > startsWith > token overlap
    let best = null;
    let bestScore = -1;
    for (const r of results) {
      const title = r.name || r.original_name || '';
      const nt = normalize(title);
      let score = 0;
      if (nt === nq) score += 100;
      if (nt.startsWith(nq) || nq.startsWith(nt)) score += 50;
      const a = new Set(nt.split(' '));
      const b = new Set(nq.split(' '));
      let common = 0;
      for (const t of a) if (b.has(t)) common++;
      score += common;
      // prefer higher popularity slightly
      score += Math.min(10, Math.round((r.popularity||0)/10));
      if (score > bestScore) {
        bestScore = score; best = r;
      }
    }
    if (best && bestScore > 0) return { tmdbId: best.id, name: best.name, original_name: best.original_name, score: bestScore };
    return null;
  } catch (e) {
    console.log('[TMDB] search error', e.message);
    return null;
  }
}

module.exports = { searchSeries };
