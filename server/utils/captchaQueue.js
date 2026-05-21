const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const jobs = new Map();

function createJob({ pageUrl, reason, screenshotBuffer, htmlSnippet }) {
  const id = uuidv4();
  const filename = `captcha-${Date.now()}-${id.slice(0,6)}.png`;
  const filepath = path.join(TMP_DIR, filename);
  if (screenshotBuffer) {
    try { fs.writeFileSync(filepath, screenshotBuffer); } catch(e) { }
  }

  let resolveFn, rejectFn;
  const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });

  const job = {
    id,
    createdAt: new Date(),
    pageUrl: pageUrl || null,
    reason: reason || 'captcha',
    screenshotPath: screenshotBuffer ? filepath : null,
    htmlSnippet: htmlSnippet || null,
    status: 'pending',
    promise: p,
    resolve: (val) => { job.status = 'resolved'; resolveFn(val); },
    reject: (err) => { job.status = 'rejected'; rejectFn(err); }
  };

  jobs.set(id, job);
  return { id, promise: p };
}

function listJobs() {
  return Array.from(jobs.values()).map(j => ({ id: j.id, createdAt: j.createdAt, pageUrl: j.pageUrl, reason: j.reason, status: j.status, screenshotPath: j.screenshotPath }));
}

function getJob(id) {
  return jobs.get(id) || null;
}

function resolveJob(id, value) {
  const j = jobs.get(id);
  if (!j) return false;
  j.resolve(value);
  return true;
}

function rejectJob(id, err) {
  const j = jobs.get(id);
  if (!j) return false;
  j.reject(err);
  return true;
}

module.exports = { createJob, listJobs, getJob, resolveJob, rejectJob, TMP_DIR };
