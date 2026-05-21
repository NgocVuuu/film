const MkvScraper = require('./utils/mkvScraper.js');

async function testOuo() {
    console.log("Starting test for ouo.io bypass...");
    const scraper = new MkvScraper();
    
    // Replace with a valid ouo.io link if available.
    const testDirectLink = 'https://ouo.io/GglcNE'; // Random test link or place a valid link here.
    
    try {
        await scraper.initBrowser();
        const gofileLink = await scraper.bypassOuoAndGetGofile(testDirectLink);
        console.log("Successfully bypassed ouo.io!");
        console.log("Extracted Gofile Link: ", gofileLink);
    } catch (error) {
        console.error("Test failed: ", error.message);
    } finally {
        await scraper.closeBrowser();
    }
}

testOuo();
