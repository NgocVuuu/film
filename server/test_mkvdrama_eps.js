const pup = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
pup.use(stealth());

(async () => {
    const b = await pup.launch({ headless: true, args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.goto('https://mkvdrama.org/760409-pursuit-of-jade', {waitUntil: 'networkidle2', timeout: 60000});
    await new Promise(r => setTimeout(r, 5000));
    
    await p.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 2000));
    
    const episodes = await p.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr'));
        return trs.map(tr => {
            const links = Array.from(tr.querySelectorAll('a')).filter(a => a.innerText.toLowerCase().includes('link'));
            return {
                text: tr.innerText.replace(/\n/g, ' '),
                links: links.map(l => ({href: l.href, text: l.innerText}))
            };
        }).filter(item => item.links.length > 0);
    });
    console.log(JSON.stringify(episodes, null, 2));
    await b.close();
})();