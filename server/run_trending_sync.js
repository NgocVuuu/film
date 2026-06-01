const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const SuggestedMovie = require('./models/SuggestedMovie');
const Movie = require('./models/Movie');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';

const scrapeMkvdramaTrending = async () => {
    try {
        console.log('[TrendingSync] Fetching mkvdrama.org ...');
        const response = await fetch('https://mkvdrama.org/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let movies = [];
        
        // Tìm Widget chứa các tab Weekly, Monthly, All
        let widgetEl = null;
        $('.ts-wpop-widget, .bixbox, .widget, .series-gen, .ts-w-popular-posts, section').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Weekly') && text.includes('Monthly') && text.includes('All')) {
                widgetEl = el;
            }
        });

        // Nếu tìm thấy widget Popular, chỉ quét phim trong đó. Nếu không, fallback quét các thẻ .item chung chung nhưng ưu tiên vùng sidebar/widget
        const targetElements = widgetEl ? $(widgetEl).find('li, .item, article') : $('.widget .item, .sidebar .item');

        targetElements.each((i, el) => {
            // Loại bỏ các li chứa chữ Weekly/Monthly vì đó là thẻ tab chứ không phải phim
            if ($(el).hasClass('active') && $(el).text().trim() === 'Weekly') return;

            const title = $(el).find('h2, h3, .title, .tt, .film-name').text().trim() || $(el).attr('title') || $(el).find('a').attr('title') || $(el).find('.series, .post-title').text().trim();
            const href = $(el).find('a').attr('href');
            let thumb = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            
            if (title && href && (href.includes('mkvdrama') || href.startsWith('/'))) {
                // Phân biệt ID dựa trên href (ví dụ: /my-royal-nemesis hoặc https://mkvdrama.net/my-royal-nemesis)
                const pathParts = href.replace(/https?:\/\/[^\/]+/, '').split('?')[0].split('/').filter(Boolean);
                const mkvdrama_id = pathParts.pop();
                
                movies.push({
                    english_name: title,
                    mkvdrama_id: mkvdrama_id,
                    thumb_url: thumb,
                    status: 'Ongoing'
                });
            }
        });
        
        const uniqueMovies = [];
        const seenIds = new Set();
        for (const m of movies) {
            if (!seenIds.has(m.mkvdrama_id)) {
                seenIds.add(m.mkvdrama_id);
                uniqueMovies.push(m);
            }
        }
        
        console.log(`[TrendingSync] Scraped ${uniqueMovies.length} unique trending movies.`);
        return uniqueMovies;
    } catch (error) {
        console.error('[TrendingSync] Error scraping mkvdrama:', error.message);
        return [];
    }
};

const runSync = async () => {
    try {
        const scrapedMovies = await scrapeMkvdramaTrending();
        
        if (scrapedMovies.length === 0) {
            console.log('[TrendingSync] No movies scraped. Exiting.');
            return;
        }
        
        let newCount = 0;
        let updateCount = 0;
        
        for (const m of scrapedMovies) {
            let suggested = await SuggestedMovie.findOne({ mkvdrama_id: m.mkvdrama_id });
            
            const regex = new RegExp(m.english_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const foundInDb = await Movie.findOne({
                $or: [
                    { name: regex },
                    { origin_name: regex },
                    { slug: regex }
                ]
            });
            
            if (suggested) {
                suggested.in_pchill_db = !!foundInDb;
                suggested.pchill_movie_id = foundInDb ? foundInDb._id : null;
                suggested.last_checked = new Date();
                
                if (foundInDb) {
                    if (foundInDb.status === 'completed') {
                        suggested.status = 'Completed';
                    }
                }
                
                await suggested.save();
                updateCount++;
            } else {
                await SuggestedMovie.create({
                    ...m,
                    in_pchill_db: !!foundInDb,
                    pchill_movie_id: foundInDb ? foundInDb._id : null
                });
                newCount++;
            }
        }
        console.log(`[TrendingSync] Sync completed. Added: ${newCount}, Updated: ${updateCount}`);
    } catch (error) {
        console.error('[TrendingSync] Error in runSync:', error);
    }
};

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('[TrendingSync] Connected to DB.');
        await runSync();
        console.log('[TrendingSync] Exiting...');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
