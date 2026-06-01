const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://mkvdrama.net/schedule', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
    const $ = cheerio.load(r.data);
    
    let widgetEl = null;
    $('.bixbox, .widget, .series-gen, .ts-w-popular-posts, section, div').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Weekly') && text.includes('Monthly') && text.includes('All') && text.includes('Queen of Tears')) {
            widgetEl = el;
        }
    });

    if (widgetEl) {
        console.log('Found widget! Class:', $(widgetEl).attr('class'));
        // log first 3 items
        $(widgetEl).find('li, .item, article').each((i, el) => {
            if(i < 3) {
                console.log('Title:', $(el).find('h2, h3, .title, .film-name, .series, .post-title, .tt').text().trim() || $(el).attr('title') || $(el).find('a').attr('title'));
            }
        });
    } else {
        console.log('Widget not found with that combination. Checking "Queen of Tears"...');
        $('div, ul, li').each((i, el) => {
            if ($(el).text().includes('Queen of Tears')) {
                console.log('Class containing Queen of Tears:', $(el).attr('class'));
            }
        });
    }
}).catch(console.error);
