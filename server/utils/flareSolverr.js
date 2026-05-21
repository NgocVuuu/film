const axios = require('axios');

const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://127.0.0.1:8191/v1';

async function fetchWithFlareSolverr(url, opts = {}) {
  try {
    const body = {
      cmd: 'request.get',
      url,
      maxTimeout: opts.maxTimeout || 60000
    };

    const res = await axios.post(FLARESOLVERR_URL, body, { timeout: (opts.maxTimeout || 60000) + 5000 });
    if (res && res.data && res.data.status === 'ok' && res.data.solution && res.data.solution.response) {
      return { ok: true, html: res.data.solution.response };
    }
    return { ok: false, error: (res && res.data) ? JSON.stringify(res.data) : 'no-solution' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { fetchWithFlareSolverr };
