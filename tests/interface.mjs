import assert from 'node:assert/strict'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {chromium} from '@playwright/test'
const browser=await chromium.launch({channel:'chrome'})
const url=process.argv[2]||pathToFileURL(path.resolve('../outputs/Minha-Vida.html')).href
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:940},isMobile:width===390,hasTouch:width===390})
  const page=await context.newPage()
  page.setDefaultTimeout(5000)
  const failures=[]
  page.on('pageerror',e=>failures.push(e.message))
  await page.goto(url)
  const btn=(name,area=page)=>area.getByRole('button',{name,exact:true})
  const nav=page.getByRole('navigation',{name:width===390?'Navegação móvel':'Navegação principal'})
  const goto=async label=>{await nav.getByRole('link',{name:label,exact:true}).click(); await page.waitForFunction(()=>location.hash.length>1)}
  const dialog=page.getByRole('dialog'),save=()=>btn('Salvar',dialog).click()
  const check=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width)
  const del=async()=>{await btn('Excluir',dialog).click();await btn('Confirmar exclusão',dialog).click()}
  await page.getByRole('heading',{name:'Visão geral'}).waitFor()
  await check()
  if(process.env.MINHAVIDA_QA_DIR)await page.screenshot({path:path.join(process.env.MINHAVIDA_QA_DIR,'dashboard-'+width+'.png'),fullPage:true})
  await btn('Dados de exemplo').click()
  await btn('Começar do zero',dialog).click();await btn('Começar vazio',dialog).click()
  await goto('Finanças');await btn('Novo lançamento').click()
  await dialog.getByLabel('Título',{exact:true}).fill('Internet teste')
  await dialog.getByLabel('Tipo',{exact:true}).selectOption('Despesa')
  await dialog.getByLabel('Valor (R$)',{exact:true}).fill('39.90')
  await dialog.getByLabel('Categoria',{exact:true}).fill('Casa teste')
  await dialog.getByLabel('Situação').selectOption('pending');await save()
  await btn('Contas a pagar').click();await btn('Dar baixa em Internet teste').click()
  await page.getByText('Nenhuma conta a pagar para este filtro.').waitFor()
  await btn('Lançamentos').click();await btn('Editar Internet teste').click();await dialog.getByLabel('Valor (R$)').fill('45.22');await save()
  await page.reload();await btn('Editar Internet teste').waitFor();await btn('Relatórios').click()
  await page.getByText('Casa teste',{exact:true}).waitFor();await check()
  await goto('Início');assert.match(await page.locator('.hero-value').innerText(),/45,22/)
  await goto('Metas');await btn('Nova meta').click()
  await dialog.getByLabel('Título',{exact:true}).fill('Correr')
  await dialog.getByLabel('Tipo',{exact:true}).selectOption('Pessoal')
  await btn('Adicionar etapa',dialog).click();await dialog.getByLabel('Etapa 1',{exact:true}).fill('Primeira corrida')
  await btn('Adicionar etapa',dialog).click();await dialog.getByLabel('Etapa 2',{exact:true}).fill('Segunda corrida')
  await dialog.getByLabel('Concluir etapa 1',{exact:true}).check();await save()
  await page.getByText('50%',{exact:true}).waitFor()
  await btn('Editar meta').click();await dialog.getByLabel('Concluir etapa 2',{exact:true}).check();await save()
  await btn('Concluídas').click();await page.getByText('100%',{exact:true}).waitFor();await check()
  await goto('Agenda');await btn('Novo compromisso').click()
  await dialog.getByLabel('Título',{exact:true}).fill('Entrega teste')
  await dialog.getByLabel('Tipo',{exact:true}).selectOption('Entrega')
  await dialog.getByLabel('Data',{exact:true}).fill('2030-03-10')
  await dialog.getByLabel('Horário (opcional)').fill('08:30');await save()
  await page.getByText('Entrega teste',{exact:true}).click();await dialog.getByLabel('Título',{exact:true}).fill('Entrega final');await save()
  await page.getByText('Entrega final',{exact:true}).waitFor();await check()
  await goto('Início');await page.getByText('Entrega final',{exact:true}).click();await del()
  await goto('Metas');await btn('Editar meta').click();await del()
  await goto('Finanças');await btn('Lançamentos').click();await btn('Editar Internet teste').click();await del()
  await page.reload()
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('minha-vida:v1')))
  assert.equal(state.example,false)
  for(const k of ['transactions','goals','events'])assert.equal(state[k].length,0,k)
  assert.deepEqual(failures,[])
  console.log(width+' px: cadastro, edição, exclusão, baixa, relatórios, etapas, calendário, persistência e navegação OK.')
  await context.close()
 }
} finally {await browser.close()}

