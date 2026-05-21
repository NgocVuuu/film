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
        const testDirectLink = 'https://ouo.io/GglcNE';
        const page = await browser.newPage();
        
        console.log(`Bypass ouo cho: ${testDirectLink}`);
        await page.goto(testDirectLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const humanBtnSelector = '#btn-main, .btn-main';
        try {
            await page.waitForSelector(humanBtnSelector, { timeout: 10000 });
            console.log('Found Human button. Simulating click...');
            
            // Wait for next form or page load
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
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
            
            // ouo might redirect again
            await page.waitForFunction(() => !window.location.href.includes('ouo'), {timeout: 10000}).catch(()=>console.log("no further redirect"));
            
        } catch (e) {
            console.log('Could not find Get Link button or timed out.');
        }
        
        let finalUrl = page.url();
        console.log(`Reached URL: ${finalUrl}`);
        
        if (finalUrl.includes('viewcrate')) {
            console.log("Extracted Viewcrate Link: ", finalUrl);
        } else {
            // maybe redirected
            console.log("Link is: ", finalUrl);
        }
    } catch (error) {
        console.error("Test failed: ", error.message);
    } finally {
        await browser.close();
    }
}

run();