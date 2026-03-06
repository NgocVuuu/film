// Post-build script: fix _async_to_generator in generated sw.js
// @ducanh2912/next-pwa compiles cacheWillUpdate with TypeScript helpers
// but doesn't include _async_to_generator/_ts_generator → SW crashes → intercepts all requests
// Fix: prepend the missing helper functions at the top of sw.js
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'public', 'sw.js');
if (!fs.existsSync(swPath)) {
  console.log('[fix-sw] sw.js not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(swPath, 'utf8');

if (!content.includes('_async_to_generator')) {
  console.log('[fix-sw] No _async_to_generator found — sw.js already clean');
  process.exit(0);
}

if (content.startsWith('function _async_to_generator')) {
  console.log('[fix-sw] Helpers already prepended — skipping');
  process.exit(0);
}

// Prepend the TypeScript runtime helpers that next-pwa omits
const helpers = `function _async_to_generator(fn){return function(){var self=this,args=arguments;return new Promise(function(resolve,reject){var gen=fn.apply(self,args);function step(key,arg){try{var info=gen[key](arg);var value=info.value;}catch(error){reject(error);return;}if(info.done){resolve(value);}else{return Promise.resolve(value).then(function(value){step("next",value);},function(err){step("throw",err);});}}return step("next");});};}
function _ts_generator(thisArg,body){var f,y,t,g,_={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1];},trys:[],ops:[]};return g={next:verb(0),"throw":verb(1),"return":verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this;}),g;function verb(n){return function(v){return step([n,v]);};}function step(op){if(f)throw new TypeError("Generator is already executing.");while(g&&(g=0,op[0]&&(_=0)),_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return{value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue;}if(op[0]===3&&(!t||(op[1]>t[0]&&op[1]<t[3]))){_.label=op[1];break;}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op[1];break;}if(t&&_.label<t[2]){_.label=t[2];t=t.value;break;}t=_.trys.pop();continue;}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return{value:op[0]?op[1]:void 0,done:true};}}
`;

fs.writeFileSync(swPath, helpers + content, 'utf8');
console.log('[fix-sw] ✓ Prepended _async_to_generator + _ts_generator helpers to public/sw.js');
