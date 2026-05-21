const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Starting test for ouo.io bypass...");
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox']
    });
    
    try {
        const testDirectLink = 'https://ouo.io/GglcNE'; // This is the link we found
        const page = await browser.newPage();
        
        console.log(`Bypass ouo cho: ${testDirectLink}`);
        await page.goto(testDirectLink, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const humanBtnSelector = '#btn-main, .btn-main';
        try {
            await page.waitForSelector(humanBtnSelector, { timeout: 10000 });
            console.log('Found Human button. Simulating click...');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
                page.click(humanBtnSelector)
            ]);
        } catch (e) {
            console.log("No human button. Continuing...");
        }

        console.log('Waiting 6 seconds (ouo timer)...');
        await new Promise(r => setTimeout(r, 6000));
        
        try {
            await page.waitForSelector(humanBtnSelector, { timeout: 10000 });
            console.log('Clicking Get Link...');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                page.click(humanBtnSelector)
            ]);
        } catch (e) {
            console.log('Could not find Get Link button or timed out.');
        }
        
        let finalUrl = page.url();
        console.log(`Reached URL: ${finalUrl}`);
        
        if (finalUrl.includes('viewcrate')) {
            console.log("Extracted Viewcrate Link: ", finalUrl);
        } else {
            const vcLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                for (let a of links) {
                    if (a.href && a.href.includes('viewcrate')) return a.href;
                }
                return null;
            });
            console.log("Extracted Viewcrate Link: ", vcLink);
            
            if (!vcLink) {
                const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(x => x.href));
                console.log("All Links on page:", allLinks);
            }
        }
    } catch (error) {
        console.error("Test failed: ", error.message);
    } finally {
        await browser.close();
    }
}

run();