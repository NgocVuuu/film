const { crawlSeasonEpisodes } = require('./episodeCrawler');
const { runAutoUploadPipeline } = require('./auto_pipeline');

async function runBatchForSeason(seasonUrl, opts = {}) {
  const delayMs = opts.delayMs || 5000;
  const episodes = await crawlSeasonEpisodes(seasonUrl);
  console.log(`Found ${episodes.length} episodes to process.`);
  for (let i = 0; i < episodes.length; i++) {
    const url = episodes[i];
    console.log(`Processing ${i+1}/${episodes.length}: ${url}`);
    try {
      await runAutoUploadPipeline(url);
    } catch (e) {
      console.error('Pipeline failed for', url, e.message);
    }
    if (i < episodes.length - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  console.log('Batch run completed');
}

module.exports = { runBatchForSeason };
