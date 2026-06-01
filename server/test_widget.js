const axios = require('axios');
const cheerio = require('cheerio');

async function checkWidget() {
    try {
        const response = await axios.get('https://mkvdrama.net/schedule', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        
        // Let's find tabs or things that say "Weekly", "Monthly"
        let found = false;
        $('.ts-w-popular-posts, .widget, .bixbox, .wpp-list, ul').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Weekly') && text.includes('Monthly') && text.includes('All')) {
                console.log('Found widget! Class:', $(el).attr('class'));
                found = true;
                // find items inside this widget
                $(el).find('li, .item, .series-list, article').each((j, item) => {
                    if (j < 3) {
                        const title = $(item).find('a').text().trim() || $(item).find('.title').text().trim();
                        const href = $(item).find('a').attr('href');
                        console.log(' - Title:', title, 'Href:', href);
                    }
                });
            }
        });
        
        if (!found) {
            console.log("Couldn't find the widget easily. Searching for the exact text 'Weekly'...");
            $('*').each((i, el) => {
                if ($(el).children().length === 0 && $(el).text().trim() === 'Weekly') {
                    console.log('Found Weekly text inside:', el.tagName, 'class:', $(el).attr('class'));
                    let parent = $(el).parent().parent().parent();
                    console.log('Parent classes:', parent.attr('class'));
                }
            });
        }
    } catch (e) {
        console.error(e.message);
    }
}
checkWidget();
