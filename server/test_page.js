const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
(async() => {
  const browser = await puppeteer.launch({headless:true});
  const page = await browser.newPage();
  await page.goto('https://mkvdrama.net/760409-pursuit-of-jade', {waitUntil:'domcontentloaded'});
  const anchors = await page.C:\Users\ADMIN\OneDrive - swqpz\Desktop\film\servereval('a', els => els.map(a => ({href: a.href, text: a.innerText})));
  const eps = anchors.filter(a => a.href && a.href.includes('pursuit-of-jade'));
  console.log(eps);
  await browser.close();
})();
