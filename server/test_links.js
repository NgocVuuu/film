const axios = require('axios');

const links = [
  'https://gofile.io/d/UZ0ko1',
  'https://pixeldrain.com/u/6Ge6h6Wr',
  'https://send.cm/jplicsdrbz8g',
  'https://gofile.io/d/CmIfoo',
  'https://pixeldrain.com/u/XtcYFX2S',
  'https://send.now/3r25ty0dkk8a',
  'https://gofile.io/d/lagqCj',
  'https://pixeldrain.com/u/mTeHNEQY',
  'https://send.now/4viy2pgnc0vm',
  'https://gofile.io/d/wKPKtx',
  'https://pixeldrain.com/u/i5mZxr1B'
];

async function checkLink(url) {
    try {
        if (url.includes('pixeldrain.com')) {
            const id = url.split('/').pop();
            const res = await axios.get(`https://pixeldrain.com/api/file/${id}/info`);
            return res.data.name;
        } else if (url.includes('gofile.io')) {
            // Need a token usually, but let's try the public web endpoint or just rely on pixeldrain
            const id = url.split('/').pop();
            const res = await axios.get(`https://api.gofile.io/contents/${id}?wt=4fd6sg89d7s6`, {
                headers: { 'Authorization': 'Bearer YOUR_TOKEN' } // Gofile API v2 requires token.
            }).catch(() => null);
            return res ? 'gofile ok' : 'gofile error';
        }
    } catch(e) {
        return e.message;
    }
}

(async () => {
    for(let l of links) {
        console.log(l, '=>', await checkLink(l));
    }
})();
