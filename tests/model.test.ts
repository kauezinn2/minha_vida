import test from 'node:test'
import assert from 'node:assert/strict'
import {blank,demo,monthAt,percent,totals,upcoming,type Transaction} from '../src/model.ts'
test('saldo usa centavos, ignora pendências e respeita o mês',()=>{
 const row:Transaction={id:'1',title:'Renda',cents:110,category:'Renda',date:'2026-11-01',paid:true,type:'Receita'}
 const rows=[row,{...row,date:'2026-10-01',cents:50},{...row,cents:10,type:'Despesa' as const},{...row,cents:75,type:'Despesa' as const,paid:false},{...row,date:'2026-12-01'}]
 assert.deepEqual(totals(rows,'2026-11'),{income:110,expense:10,balance:150,pending:75})
})
test('metas calculam dinheiro e etapas',()=>{
 const s=demo(new Date(2026,10,22))
 assert.deepEqual(s.goals.map(percent),[65,40,25]);assert.equal(percent({...s.goals[0],current:2000000}),100)
})
test('calendário atravessa ano e exclui horários que passaram',()=>{
 assert.equal(monthAt('2026-01',-1),'2025-12')
 const e=demo(new Date(2026,10,22)).events[0]
 const list=['09:04','09:05','','12:00'].map(time=>({...e,date:'2026-11-22',time}))
 assert.deepEqual(upcoming(list,new Date(2026,10,22,9,5)).map(x=>x.time),['','09:05','12:00'])
 assert.equal(blank().transactions.length,0)
})

