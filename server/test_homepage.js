const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
        const res = await axios.get('https://mkvdrama.org/', {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}});
        const $ = cheerio.load(res.data);
        console.log('Title:', $('title').text());
        
        let foundWeekly = false;
        $('.bixbox, .widget, .series-gen, .ts-w-popular-posts, section, div.wpp-list, div.wpp-tabs').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Weekly') || text.includes('Monthly') || text.includes('All')) {
                console.log('Found widget! Class:', $(el).attr('class'));
                foundWeekly = true;
                
                let count = 0;
                $(el).find('li, .item, article').each((j, item) => {
                    const title = $(item).find('h2, h3, .title, .film-name').text().trim() || $(item).find('a').attr('title');
                    if(title && count < 3) {
                        console.log(' - Title:', title);
                        count++;
                    }
                });
            }
        });

        if (!foundWeekly) {
            console.log('Could not find widget. Text in body:', $('body').text().substring(0, 200).replace(/\s+/g, ' '));
        }
    } catch(e) {
        console.error(e.message);
    }
}
test();
