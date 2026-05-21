const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('page.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

// mkvdrama usually has <p> or <div> that text contains "2160p" followed by links.
const elements = Array.from(document.querySelectorAll('*'));
for (const el of elements) {
    if (el.textContent.includes('2160p')) {
        // Find links near this element or inside it.
        const links = Array.from(el.querySelectorAll('a'));
        if (links.length > 0) {
            console.log("Found 2160p related element:", el.tagName, el.className);
            links.forEach(l => {
                if (l.href.includes('ouo.io')) {
                    console.log('Text:', l.textContent, 'Href:', l.href);
                }
            });
            break;
        }
    }
}
