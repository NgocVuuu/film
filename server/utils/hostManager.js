const mongoose = require('mongoose');
const HostUpload = require('../models/HostUpload');
const Movie = require('../models/Movie');
const { PremiumHostService, AbyssHostService, play4meAPI, seekstreamingAPI } = require('./videoHostProviders');
const HostFolder = require('../models/HostFolder');

// map host key to API instance
const hostApis = {
  Play4Me: play4meAPI,
  Seekstreaming: seekstreamingAPI
};

function normalizeMovieFolderName(name) {
  return String(name || '')
    .replace(/\s*[-–]\s*S\d{1,2}\s*$/i, '')
    .replace(/\s*[-–]?\s*Season\s*\d{1,2}\s*$/i, '')
    .replace(/\s*[-–]?\s*Ph[aà]n\s*\d{1,2}\s*$/i, '')
    .trim();
}

function buildFolderName(series, season) {
  const base = normalizeMovieFolderName(series || 'unknown');
  const s = String(season || '').trim();
  if (!s) return base;
  return `${base} - ${s}`;
}

async function connectIfNeeded() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
}

async function recordUpload({ series, season, episode, tmdbId, movieId, sourcePage, sourceDirectUrl, filename, host, taskId, status, notes, contentHash, contentLength, duration, retries, sourceMetadata, subtitleStatus, subtitleLog }) {
  await connectIfNeeded();
  const doc = new HostUpload({ series, season, episode, tmdbId, movieId, sourcePage, sourceDirectUrl, filename, host, taskId, status, notes, contentHash, contentLength, duration, retries, sourceMetadata, subtitleStatus, subtitleLog });
  await doc.save();
  return doc;
}

// Deduplication check
async function checkDuplicate(series, season, episode, host, sourceDirectUrl) {
  await connectIfNeeded();
  if (sourceDirectUrl) {
    const byUrl = await HostUpload.findOne({ host, sourceDirectUrl, status: { $in: ['pending', 'processing', 'completed'] } });
    if (byUrl) return byUrl;
  }
  if (series && season && episode) {
    const byEp = await HostUpload.findOne({ host, series, season, episode, status: { $in: ['pending', 'processing', 'completed'] } });
    if (byEp) return byEp;
  }
  return null;
}

async function syncMovieEpisode(doc, videoId) {
  if (!doc.movieId || !videoId) return;
  try {
    const movie = await Movie.findById(doc.movieId);
    if (!movie) return;

    const hostApi = hostApis[doc.host];
    if (!hostApi) return;
    const embedUrl = hostApi.getEmbedUrl(videoId);

    // find or create server tab based on host
    const serverName = `PChill - ${doc.host}`;
    let serverObj = movie.episodes.find(e => e.server_name === serverName);
    if (!serverObj) {
      serverObj = { server_name: serverName, server_data: [] };
      movie.episodes.push(serverObj);
    }

    // Check if episode already exists in this server
    const exists = serverObj.server_data.find(ep => ep.name === doc.episode);
    if (exists) {
      exists.link_embed = embedUrl;
      exists.filename = doc.filename;
    } else {
      const epSlug = doc.episode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      serverObj.server_data.push({
        name: doc.episode,
        slug: epSlug,
        filename: doc.filename,
        link_embed: embedUrl
      });
    }

    await movie.save();
    console.log(`\n✅ [SYNC] Đã cập nhật tập "${doc.episode}" vào hệ thống PChill Server cho phim ${movie.name}!`);

    // Emit Realtime Event cho các máy khách đang xem phim này
    if (global.io) {
      global.io.emit('episode_added', {
        movieSlug: movie.slug,
        serverName: serverName,
        episode: {
          name: doc.episode,
          slug: doc.episode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          filename: doc.filename,
          link_embed: embedUrl,
          link_m3u8: '' // M3u8 chưa có từ host, cập nhật sau nếu cần
        }
      });
    }

  } catch (e) {
    console.error('[SYNC ERROR] Cập nhật tập phim lỗi:', e.message);
  }
}

async function updateUpload(id, patch) {
  await connectIfNeeded();
  patch.updatedAt = new Date();
  return HostUpload.findByIdAndUpdate(id, patch, { new: true });
}

async function findUploads(query = {}, opts = {}) {
  await connectIfNeeded();
  return HostUpload.find(query).sort({ createdAt: -1 }).limit(opts.limit || 100).lean();
}

async function getUploadByTask(host, taskId) {
  await connectIfNeeded();
  return HostUpload.findOne({ host, taskId });
}

async function pollAndSyncStatus(hostService, taskId, docId) {
  try {
    const doc = await HostUpload.findById(docId);
    if (!doc) return;
    
    const status = await hostService.checkUploadStatus(taskId);
    let mapped = 'pending';
    
    if (status.status === 'completed') {
        const noSubtitleHosts = ['Play4Me', 'Seekstreaming', 'SeekStreaming'];
        if (!noSubtitleHosts.includes(doc.host) && (doc.subtitleStatus === 'pending' || doc.subtitleStatus === 'processing')) {
            console.log(`[SYNC] Video ${doc.episode} đã xử lý xong trên Host, nhưng phụ đề đang bóc tách. Đợi chu kỳ sau...`);
            mapped = 'processing';
        } else {
            mapped = 'completed';
        }
    } else if (status.status === 'error') {
        mapped = 'failed';
    } else {
        mapped = 'processing';
    }

    const updatedDoc = await updateUpload(docId, { status: mapped, notes: status.error || '', videoId: status.videoId || null });
    if (mapped === 'completed' && status.videoId && updatedDoc) {
      await syncMovieEpisode(updatedDoc, status.videoId);

      // Rename on host so dashboard name matches our naming convention
      try {
        const hostApi = hostApis[updatedDoc.host];
        if (hostApi?.renameVideo && updatedDoc.filename) {
          const renamed = await hostApi.renameVideo(status.videoId, updatedDoc.filename);
          if (renamed) console.log(`[${updatedDoc.host}] Renamed video ${status.videoId} -> ${updatedDoc.filename}`);
        }
      } catch (renameErr) {
        console.log(`[${updatedDoc.host}] Rename video error:`, renameErr.message);
      }

      // Assign to host folder after video is actually created
      try {
        const folderName = updatedDoc.series ? buildFolderName(updatedDoc.series, updatedDoc.season || 'S01') : null;
        if (folderName) {
          const assigned = await assignUploadToFolder(updatedDoc.host, status.videoId, updatedDoc.series, updatedDoc.season || 'S01', folderName);
          if (assigned?.ok) {
            console.log(`[${updatedDoc.host}] Assigned video ${status.videoId} to folder ${assigned.folderId}`);
          } else {
            console.log(`[${updatedDoc.host}] Assign folder failed after completion:`, assigned?.error || 'unknown');
          }
        }
      } catch (folderErr) {
        console.log(`[${updatedDoc.host}] Assign folder error:`, folderErr.message);
      }
    }
  } catch (e) {
    console.error('[POLL ERROR] Status poll/sync failed:', e.message);
    if (e.response && e.response.status === 404) {
      updateUpload(docId, { status: 'failed', notes: 'Upload task not found on host (404)' }).catch(()=>{});
    }
  }
}

async function createOrGetFolder(series, season, host, displayName) {
    await connectIfNeeded();
    const normalizedSeries = normalizeMovieFolderName(series || displayName || 'unknown');
    const seasonName = String(season || '').trim() || null;
    const resolvedDisplayName = displayName || buildFolderName(normalizedSeries, seasonName || 'S01');

    const keyQuery = { host, series: normalizedSeries || null, season: seasonName || 'S01' };
    let found = await HostFolder.findOne(keyQuery);
    // Nếu tìm thấy mà folderId là string rác (do lỗi cũ), ta bỏ qua và tạo lại
    if (found && !found.folderId.startsWith('local-')) return found.folderId;

    const api = hostApis[host];
    let folderId = null;
    if (api) {
        try {
            folderId = await api.createFolder(resolvedDisplayName);
        } catch (e) {
            console.error(`[${host}] Failed to create folder ${resolvedDisplayName}`, e.message);
            folderId = null;
        }
    }

    if (!folderId) {
        // Return resolvedDisplayName (the real display name) as a fallback so remoteUploadWithRetry can try to create it!
        return resolvedDisplayName; 
    }

    // Cập nhật DB
    if (found) {
        found.folderId = folderId;
        found.metadata = { displayName: resolvedDisplayName };
        await found.save();
    } else {
        const doc = new HostFolder({
            host,
            series: normalizedSeries,
            season: seasonName || 'S01',
            folderId,
            metadata: { displayName: resolvedDisplayName }
        });
        await doc.save();
    }
    return folderId;
}

async function assignUploadToFolder(host, videoId, series, season, folderName) {
  await connectIfNeeded();
  const api = hostApis[host];
  const normalizedFolderName = folderName || buildFolderName(series, season || 'S01');
  const folderId = await createOrGetFolder(series, season || 'S01', host, normalizedFolderName);
  if (api) {
    try {
      const ok = await api.assignToFolder(videoId, folderId);
      return { ok, folderId };
    } catch (e) {
      return { ok: false, folderId, error: e.message };
    }
  }
  return { ok: false, folderId, error: 'No API for host' };
}

/**
 * Create player on a host and apply initial configuration and ads
 * @param {string} hostKey - one of keys in hostApis (Play4Me, Abyss)
 * @param {string} domain - custom domain or subdomain (e.g. embed.pchill.online)
 * @param {Object} config - partial player config to PATCH after creation
 * @param {Array} ads - optional array of ad payloads to create via POST
 * @returns {Object} { ok: boolean, playerId: string|null, errors: [] }
 */
async function createAndConfigurePlayer(hostKey, domain, config = {}, ads = []) {
  await connectIfNeeded();
  const api = hostApis[hostKey];
  if (!api) return { ok: false, playerId: null, errors: ['No API for host'] };

  const errors = [];
  try {
    // try find existing player for domain first
    let playerId = await api.findPlayerByDomain(domain).catch(() => null);
    if (!playerId) {
      playerId = await api.createPlayer(domain);
    }
    if (!playerId) return { ok: false, playerId: null, errors: ['createPlayer failed'] };

    // Ensure restrictEmbed includes pchill domains if not provided
    const ensureConfig = Object.assign({}, config);
    if (!ensureConfig.restrictEmbed || !Array.isArray(ensureConfig.restrictEmbed)) {
      ensureConfig.restrictEmbed = ['pchill.online', 'www.pchill.online'];
    } else {
      if (!ensureConfig.restrictEmbed.includes('pchill.online')) ensureConfig.restrictEmbed.push('pchill.online');
      if (!ensureConfig.restrictEmbed.includes('www.pchill.online')) ensureConfig.restrictEmbed.push('www.pchill.online');
    }

    const updated = await api.updatePlayer(playerId, ensureConfig);
    if (!updated) errors.push('updatePlayer failed');

    // Create ads if provided
    const createdAds = [];
    for (const ad of ads || []) {
      try {
        const adId = await api.createPlayerAd(playerId, ad);
        if (adId) createdAds.push(adId);
        else errors.push('createPlayerAd returned null');
      } catch (e) {
        errors.push(`createPlayerAd error: ${e.message}`);
      }
    }

    return { ok: errors.length === 0, playerId, errors, createdAds };
  } catch (e) {
return { ok: false, playerId: null, errors: [e.message || String(e)] };
  }
}

// Remote upload with robust retry/backoff wrapper
async function remoteUploadWithRetry(hostKey, videoUrl, title, folderName = null, uploadId = null, attempts = 3, backoffs = [5000, 15000, 45000]) {
  const api = hostApis[hostKey];
  if (!api) throw new Error(`No API configured for host ${hostKey}`);

  // Create folder and get actual ID before uploading
  let actualFolderId = null;
  if (folderName) {
    try {
      const createdId = await api.createFolder(folderName);
      if (createdId) actualFolderId = createdId;
    } catch (e) {
      console.log(`[${hostKey}] Failed to resolve folder ID for ${folderName}`, e.message);
    }
  }

  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const taskId = await api.remoteUpload(videoUrl, title, actualFolderId, uploadId);
      return { ok: true, taskId, attempts: i + 1, actualFolderId };
    } catch (e) {
      lastErr = e;
      const status = e.response?.status;
      const dataStr = JSON.stringify(e.response?.data || e.message || '').toLowerCase();

      // If unsupported URL (4xx, specifically 400 bad request / unsupported)
      if (status >= 400 && status < 500 && status !== 429) {
        if (dataStr.includes('unsupported') || dataStr.includes('invalid') || status === 400 || status === 403) {
          console.log(`[${hostKey}] Unsupported URL detected. Not retrying.`);
          return { ok: false, error: e.message, reason: 'unsupported_url', attempts: i + 1 };
        }
      }

      let wait = backoffs[i] || backoffs[backoffs.length - 1];

      // Handle Rate Limiting (429)
      if (status === 429) {
        const retryAfter = e.response?.headers?.['retry-after'];
        if (retryAfter) {
          wait = parseInt(retryAfter, 10) * 1000;
        } else {
          wait = Math.max(wait, 15000);
        }
        console.log(`[${hostKey}] Rate limited (429). Retrying in ${wait}ms`);
      } else {
        console.log(`[${hostKey}] remoteUpload attempt ${i + 1} failed: ${e.message}. Retrying in ${wait}ms`);
      }

      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  return { ok: false, error: lastErr?.message || 'Unknown error', reason: 'max_retries_reached', attempts };
}

module.exports = {
  recordUpload,
  checkDuplicate,
  updateUpload,
  findUploads,
  getUploadByTask,
  pollAndSyncStatus,
  createOrGetFolder,
  assignUploadToFolder,
  remoteUploadWithRetry,
  syncMovieEpisode,
  createAndConfigurePlayer
};
