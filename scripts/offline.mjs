import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const files = (await readdir('dist',{recursive:true,withFileTypes:true})).filter(f=>f.isFile() && f.name!=='sw.js')
import path from 'node:path'
const urls = files.map(f=>'/'+path.relative('dist',path.join(f.parentPath,f.name)).split(path.sep).join('/'))
const hash=createHash('sha256')
for(const url of urls) hash.update(await readFile('dist'+url))
const version=hash.digest('hex').slice(0,12)
await writeFile('dist/sw.js', `const SCOPE=new URL(self.registration.scope).pathname;
const PREFIX='minha-vida:'+encodeURIComponent(SCOPE)+':';
const CACHE=PREFIX+${JSON.stringify(version)}, FILES=${JSON.stringify(urls)}.map(name=>SCOPE+name.slice(1));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request, url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.open(CACHE).then(c=>c.match(SCOPE+'index.html'))));return}
 if(FILES.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.pathname))||fetch(req)));
});`)

