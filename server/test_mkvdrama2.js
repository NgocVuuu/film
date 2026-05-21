const pup = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
pup.use(stealth());

(async () => {
    const b = await pup.launch({ headless: true, args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.goto('https://mkvdrama.org/?s=Queen+of+Tears');
    const t = await p.title();
    console.log(t);
    const html = await p.$$eval('a', els => els.map(e => ({href: e.href, text: e.innerText})));
    console.log(html.filter(h => h.href && h.href.includes('queen')));
    await b.close();
})();