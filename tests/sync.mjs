// Build with the fixture URL and the Pages path before running this isolated browser test.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {chromium} from '@playwright/test'

const browser=await chromium.launch({channel:'chrome'})
const site='https://minha-vida.example/minha-vida/'
const api='https://fixture.invalid'
const records=[]
let disconnected=false
const owner='b10cc701-bbed-43a9-a079-64568f084a44'
try {
 const contexts=await Promise.all([1440,390].map(width=>browser.newContext({viewport:{width,height:850},serviceWorkers:'block'})))
 const pages=[]
 for(const context of contexts){
   await context.route(site+'**',async route=>{
     const filename=new URL(route.request().url()).pathname.slice('/minha-vida/'.length)||'index.html'
     const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'}
     await route.fulfill({body:await readFile(path.join('dist',filename)),contentType:mime[path.extname(filename)]})
   })
   await context.route(api+'/**',async route=>{
     const req=route.request(),url=new URL(req.url()),json=body=>route.fulfill({json:body})
     if(url.pathname.includes('/auth/v1/token'))return json({access_token:'fixture-user-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner,email:'qa@example.test'}})
     if(disconnected)return route.abort('internetdisconnected')
     assert.equal(req.headers().authorization,'Bearer fixture-user-token')
     if(url.pathname.endsWith('/minha_vida_codigo'))return json('db8a2312-1c65-4a96-96ac-368ab69c5317')
     if(req.method()==='GET')return json(records)
     const item=req.postDataJSON()
     if(req.method()==='POST'){
       assert(!records.some(r=>r.id===item.id),'inclusão duplicada')
       const row={...item,revision:1}
       records.push(row);return json([row])
     }
     const row=records.find(r=>'eq.'+r.id===url.searchParams.get('id')&&'eq.'+r.revision===url.searchParams.get('revision'))
     if(!row)return json([])
     Object.assign(row,item,{revision:row.revision+1});return json([row])
   })
   const p=await context.newPage();p.setDefaultTimeout(7000);await p.goto(site)
   await p.getByRole('button',{name:'Conectar conta',exact:true}).click()
   await p.getByLabel('E-mail',{exact:true}).fill('qa@example.test')
   await p.getByLabel('Senha',{exact:true}).fill('apenas-teste-local')
   await p.getByRole('button',{name:'Entrar',exact:true}).click()
   await p.getByText('Sincronizado com a conta',{exact:true}).waitFor();pages.push(p)
 }
 const [desktop,mobile]=pages
 disconnected=true
 await desktop.getByRole('button',{name:'Adicionar',exact:true}).click()
 await desktop.getByRole('button',{name:'Lançamento',exact:true}).click()
 await desktop.getByLabel('Título',{exact:true}).fill('Pagamento de teste')
 await desktop.getByLabel('Valor (R$)',{exact:true}).fill('42.35')
 await desktop.getByLabel('Categoria',{exact:true}).fill('Renda')
 await desktop.getByRole('button',{name:'Salvar',exact:true}).click()
 await desktop.getByText('Alterações pendentes',{exact:true}).waitFor()
 assert.equal(records.length,0)
 await desktop.reload();await desktop.getByText('Alterações pendentes',{exact:true}).waitFor()
 disconnected=false
 await desktop.evaluate(()=>dispatchEvent(new Event('online')))
 await desktop.getByText('Sincronizado com a conta',{exact:true}).waitFor()
 assert.equal(records.length,1);assert.equal(records[0].payload.cents,4235)
 await mobile.evaluate(()=>dispatchEvent(new Event('focus')))
 await mobile.waitForFunction(()=>document.querySelector('.hero-value')?.textContent.includes('42,35'))
 await mobile.getByRole('button',{name:'Sobre o aplicativo',exact:true}).click()
 await mobile.getByRole('button',{name:'Vincular ao ChatGPT'}).click()
 await mobile.getByText('db8a2312-1c65-4a96-96ac-368ab69c5317',{exact:true}).waitFor()
 console.log('Dois navegadores isolados: login, fila offline persistente, reconexão, sincronização em centavos e código de vínculo OK (API simulada).')
}finally{await browser.close()}

