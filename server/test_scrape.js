const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('schedule.html', 'utf8');
const $ = cheerio.load(html);

// Find the Weekly, Monthly, All tabs
const trendingTabs = $('.nav-tabs li a');
console.log('Trending Tabs found:', trendingTabs.length);
trendingTabs.each((i, el) => {
    console.log($(el).text().trim(), $(el).attr('href'));
});

// Find the content lists (usually .tab-content inside the widget)
const movies = $('.tab-content .item, .tab-content .film-detail, .widget .item, .widget .film-poster');
console.log('Trending Movies found:', movies.length);

if (movies.length > 0) {
    const firstMovie = $(movies[0]);
    console.log('First Movie HTML:', firstMovie.html().substring(0, 300));
} else {
    // If we didn't find it with common classes, let's just print any href containing a movie link inside a block that might be trending
    const listItems = $('li a[href*="https://mkvdrama.org/"]');
    console.log('Total movie links found:', listItems.length);
}
