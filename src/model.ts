export type Page = 'inicio' | 'financas' | 'metas' | 'agenda'
export type Kind = 'transactions' | 'goals' | 'events'
export type Transaction = { id: string; title: string; date: string; type: 'Receita' | 'Despesa'; cents: number; category: string; paid: boolean }
export type Step = { id: string; title: string; done: boolean }
export type Goal = { id: string; title: string; date: string; type: 'Financeira' | 'Pessoal'; target: number; current: number; priority: boolean; steps: Step[]; icon: string }
export const eventTypes = ['Compromisso', 'Evento', 'Prova', 'Entrega', 'Lembrete'] as const
export type Entry = { id: string; title: string; date: string; time: string; type: typeof eventTypes[number]; place: string; notes: string }
export type State = { version: 1; transactions: Transaction[]; goals: Goal[]; events: Entry[]; example: boolean }
export type RecordItem = Transaction | Goal | Entry
export const blank = (): State => ({ version: 1, transactions: [], goals: [], events: [], example: false })
export const id = () => crypto.randomUUID()
export const dayKey = (d: Date) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
export const localDate = (d: string) => new Date(d + 'T12:00:00')
export const monthAt = (key: string, offset: number) => { const d = localDate(key.slice(0,7)+'-01'); d.setMonth(d.getMonth()+offset); return dayKey(d).slice(0,7) }
export const fmt = (d: string, options: Intl.DateTimeFormatOptions) => localDate(d).toLocaleDateString('pt-BR',options)
export const money = (cents: number) => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export const percent = (g: Goal) => Math.min(100, Math.round(g.type === 'Financeira' ? g.current / Math.max(1,g.target) * 100 : g.steps.filter(x=>x.done).length / Math.max(1,g.steps.length)*100))
export function totals(rows: Transaction[], month: string) {
  let income=0, expense=0, balance=0, pending=0
  for(const r of rows) {
    const m = r.date.slice(0,7)
    if(r.paid && m<=month) balance += r.type==='Receita' ? r.cents : -r.cents
    if(m!==month) continue
    if(!r.paid) { if(r.type==='Despesa') pending+=r.cents; continue }
    if(r.type==='Receita') income+=r.cents
    else expense+=r.cents
  }
  return {income,expense,balance,pending}
}
export function demo(now = new Date()): State {
  const today=dayKey(now), month=today.slice(0,7)
  const after=(n:number)=>{const d=new Date(now);d.setDate(d.getDate()+n);return dayKey(d)}
  const rows:Transaction[]=[]
  const add=(title:string,type:Transaction['type'],value:number,date:string,category:string,paid=true)=>rows.push({id:id(),title,type,cents:Math.round(value*100),date,category,paid})
  ;[[1800,1600],[2700,2100],[2250,2150],[3400,2600],[3050,2600],[4250,1950]].forEach(([income,expense],i)=>{
    const m=monthAt(month,i-5)
    add('Recebimento mensal','Receita',income,m+'-01','Renda')
    add('Compras do mês','Despesa',expense*0.4,m+'-01','Alimentação')
    add('Despesas da casa','Despesa',expense*0.6,m+'-01','Moradia')
  })
  add('Internet','Despesa',99.9,month+'-28','Moradia',false)
  return {version:1, example:true, transactions:rows,goals:[
    {id:id(),title:'Reserva de emergência',type:'Financeira',date:after(120),target:1000000,current:650000,priority:true,steps:[],icon:'shield'},
    {id:id(),title:'Viagem de férias',type:'Financeira',date:after(80),target:500000,current:200000,priority:true,steps:[],icon:'plane'},
    {id:id(),title:'Ler 12 livros',type:'Pessoal',date:after(150),target:0,current:0,priority:true,steps:Array.from({length:12},(_,i)=>({id:id(),title:'Livro '+(i+1),done:i<3})),icon:'book'}
  ],events:[
    {id:id(),title:'Planejamento da semana',date:after(1),time:'09:00',type:'Compromisso',place:'Em casa',notes:''},
    {id:id(),title:'Entrega do projeto',date:after(2),time:'14:30',type:'Entrega',place:'SENAI',notes:''},
    {id:id(),title:'Revisão do orçamento',date:after(4),time:'18:00',type:'Lembrete',place:'',notes:''}
  ]}
}
export const storageKey='minha-vida:v1'
export function readLocal():State {
  const raw=localStorage.getItem(storageKey)
  if(!raw){ const s=demo(); localStorage.setItem(storageKey,JSON.stringify(s)); return s }
  const s=JSON.parse(raw)
  if(s.version!==1 || !['transactions','goals','events'].every(k=>Array.isArray(s[k]))) throw new Error('Formato de dados incompatível')
  return s
}
export function mutate(fn:(s:State)=>State):State {
  const next=fn(readLocal())
  localStorage.setItem(storageKey,JSON.stringify(next))
  return next
}
export const upcoming = (events:Entry[],now:Date) => {
  const key=dayKey(now), time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')
  return events.filter(e=>e.date>key || (e.date===key && (!e.time||e.time>=time))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
}
