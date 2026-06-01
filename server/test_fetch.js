const cheerio = require('cheerio');
fetch('https://mkvdrama.org/', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
}).then(res => res.text()).then(html => {
    const $ = cheerio.load(html);
    let count = 0;
    
    // Tìm các thẻ có chứa 'Weekly' và 'Monthly'
    $('*').each((i, el) => {
        if ($(el).children().length === 0) {
            const text = $(el).text().trim();
            if (text === 'Weekly') {
                console.log('Found Weekly inside:', el.tagName, $(el).attr('class'));
                // print parents
                let parent = $(el).parent();
                console.log(' - Parent:', parent.prop('tagName'), parent.attr('class'));
                let grand = parent.parent();
                console.log(' - Grand:', grand.prop('tagName'), grand.attr('class'));
                let great = grand.parent();
                console.log(' - Great:', great.prop('tagName'), great.attr('class'));
                let great2 = great.parent();
                console.log(' - Great2:', great2.prop('tagName'), great2.attr('class'));
            }
        }
    });

}).catch(console.error);
