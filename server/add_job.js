require('dotenv').config();
const { addUploadJob } = require('./utils/queue');

async function main() {
    const jobData = {
        movieId: '1234567890abcdef12345678', // Replace with an actual Movie _id from your MongoDB
        showName: 'TEST SHOW',
        seasonNumber: 1,
        episodeNumber: 1,
        sourceUrl: 'https://href.li/?https://viewcrate.com/test-url', // change as needed
        targetHost: 'Play4Me',
        tmdbId: 12345
    };

    console.log('Adding job to queue...', jobData);
    const job = await addUploadJob(jobData);
    console.log(`Job added with ID: ${job.id}`);
    process.exit(0);
}

main().catch(console.error);
