const mongoose = require('mongoose');
const Movie = require('../models/Movie');

require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const docs = await Movie.find({ 
            'episodes.server_name': /thuyết minh/i, 
            lang: { $not: /thuyết minh/i } 
        }, 'name lang episodes.server_name').limit(5);
        
        console.log(JSON.stringify(docs, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
check();
