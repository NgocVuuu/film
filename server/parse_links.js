const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('c:\\Users\\ADMIN\\OneDrive - swqpz\\Desktop\\film\\server\\page.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

const links = Array.from(document.querySelectorAll('a'));
links.forEach(l => {
    if (l.href.includes('ouo.io')) {
        console.log('Text:', l.textContent, 'Href:', l.href);
        // Find parent with text
        const parent = l.parentElement;
        if (parent) {
            console.log('Parent Text:', parent.textContent.substring(0, 100));
        }
    }
});
