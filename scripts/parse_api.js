const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('docs/play4me-openapi.json', 'utf8'));
const paths = Object.keys(doc.paths);
paths.forEach(p => {
  const methods = Object.keys(doc.paths[p]);
  methods.forEach(m => {
    if (p.includes('upload') || p.includes('remote') || p.includes('clone') || p.includes('video') || p.includes('url')) {
      console.log(`${m.toUpperCase()} ${p}: ${doc.paths[p][m].summary || ''}`);
    }
  });
});
