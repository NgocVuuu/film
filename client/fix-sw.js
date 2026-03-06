// Post-build script: fix _async_to_generator in generated sw.js
// @ducanh2912/next-pwa compiles cacheWillUpdate with TypeScript helpers
// but doesn't include _async_to_generator/_ts_generator → SW crashes → intercepts all requests
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'public', 'sw.js');
if (!fs.existsSync(swPath)) {
  console.log('[fix-sw] sw.js not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(swPath, 'utf8');

const broken = /\{cacheWillUpdate:function\(e\)\{var a=e\.response;return _async_to_generator\(function\(\)\{return _ts_generator\(this,function\([a-z]\)\{return\[2,a&&"opaqueredirect"===a\.type\?new Response\(a\.body,\{status:200,statusText:"OK",headers:a\.headers\}\):a\]\}\)\}\)\(\)\}\}/;
const fixed = '{cacheWillUpdate:async function({response:r}){return r&&"opaqueredirect"===r.type?new Response(r.body,{status:200,statusText:"OK",headers:r.headers}):r}}';

if (broken.test(content)) {
  content = content.replace(broken, fixed);
  fs.writeFileSync(swPath, content, 'utf8');
  console.log('[fix-sw] ✓ Fixed _async_to_generator in public/sw.js');
} else if (content.includes('_async_to_generator')) {
  // Fallback: broader replace
  content = content.replace(
    /\{cacheWillUpdate:function\([^)]*\)\{[^}]*_async_to_generator[^}]*\}[^}]*\}\}/,
    fixed
  );
  fs.writeFileSync(swPath, content, 'utf8');
  console.log('[fix-sw] ✓ Fixed _async_to_generator (fallback pattern) in public/sw.js');
} else {
  console.log('[fix-sw] No _async_to_generator found — sw.js already clean');
}
