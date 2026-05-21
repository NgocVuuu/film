const pup = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
pup.use(stealth());

(async () => {
    try {
        const b = await pup.launch({ headless: true, args: ['--no-sandbox'] });
        const p = await b.newPage();
        await p.goto('https://mkvdrama.net/queen-of-tears', { waitUntil: 'networkidle2' });
        
        const pageTitle = await p.title();
        console.log("Title:", pageTitle);

        // Extract all links
        const links = await p.$$eval('a', els => els.map(e => ({href: e.href, text: e.innerText.trim()})));
        
        // Filter possible episode links
        const epLinks = links.filter(l => l.href && l.href.includes('queen-of-tears'));
        console.log("Found links:", epLinks.length);
        console.log(epLinks.slice(0, 15));

        await b.close();
    } catch (e) {
        console.error(e);
    }
})();