const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://mkvdrama.net/760409-pursuit-of-jade", { waitUntil: "domcontentloaded" });
    const eps = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a"))
            .map(a => a.href)
            .filter(h => h.includes("pursuit-of-jade") && h !== "https://mkvdrama.net/760409-pursuit-of-jade");
    });
    console.log(Array.from(new Set(eps)));
    await browser.close();
})();
