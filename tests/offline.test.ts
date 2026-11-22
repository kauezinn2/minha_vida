import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile, access } from 'node:fs/promises'
test('o service worker armazena o build e recupera a página na ausência de rede',async()=>{
  const listeners=new Map<string,Function>()
  const stored=new Map<string,string>()
  const cache={async addAll(paths:string[]){for(const p of paths){await access('dist'+p);stored.set(p,p)}},async match(p:string){return stored.get(p)}}
  const self={registration:{scope:'https://example.test/'},location:{origin:'https://example.test'},addEventListener:(name:string,handler:Function)=>listeners.set(name,handler),skipWaiting(){},clients:{claim(){}}}
  vm.runInNewContext(await readFile('dist/sw.js','utf8'),{self,caches:{open:async()=>cache,keys:async()=>[]},URL,fetch:async()=>{throw Error('offline')}})
  let done:Promise<unknown>
  listeners.get('install')!({waitUntil:(p:Promise<unknown>)=>{done=p}})
  await done!
  for(const asset of ['/index.html','/manifest.webmanifest','/icon-192.png','/icon-512.png','/serra.svg'])assert(stored.has(asset))
  assert([...stored.keys()].some(k=>k.endsWith('.js')))
  const respond=(p:Promise<unknown>)=>{done=p}
  listeners.get('fetch')!({request:{mode:'navigate',method:'GET',url:'https://example.test/'},respondWith:respond})
  assert.equal(await done!,'/index.html')
  listeners.get('fetch')!({request:{mode:'cors',method:'GET',url:'https://example.test/icon-192.png'},respondWith:respond})
  assert.equal(await done!,'/icon-192.png')
})

