const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getLatest() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://mkvdrama.org/');
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h2 a, .title a, article a')).map(a => a.href).filter(href => href.includes('mkvdrama.org') && !href.includes('category') && href !== 'https://mkvdrama.org/');
    });
    console.log(links[0]);
    await browser.close();
}
getLatest();