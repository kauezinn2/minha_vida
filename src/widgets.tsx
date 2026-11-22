import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, BarChart3, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, EyeOff, Flag, Layers3, MapPin, Plane, ShieldCheck, Target, Wallet, X } from 'lucide-react'
import { dayKey, fmt, localDate, money, monthAt, percent, totals, type Entry, type Goal, type Transaction } from './model'

export function Dialog({title,children,close}:{title:string;children:ReactNode;close:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const e=ref.current!;e.showModal();return()=>e.close()},[])
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===ref.current)close()}}><div className="dialog-inner"><header className="flex items-center justify-between gap-4"><h2>{title}</h2><button className="iconbtn" onClick={close} aria-label="Fechar"><X size={19}/></button></header>{children}</div></dialog>
}
export function Empty({children}:{children:ReactNode}) {return <div className="empty">{children}</div>}
export function PanelTitle({icon:Icon,title,action}:{icon:typeof Target;title:string;action?:ReactNode}){return <div className="paneltitle"><div className="flex items-center gap-2.5"><Icon size={19}/><h2>{title}</h2></div>{action}</div>}
export function Hero({rows,month}:{rows:Transaction[];month:string}) {
 const [hidden,hide]=useState(false),v=totals(rows,month), value=(n:number)=>hidden?'••••••':money(n)
 return <section className="hero"><div className="heroart" aria-hidden="true"/><div className="hero-inner"><div className="balance-label"><Wallet size={16}/> Saldo acumulado <button onClick={()=>hide(!hidden)} title={hidden?'Mostrar valores':'Ocultar valores'} aria-label={hidden?'Mostrar valores':'Ocultar valores'}>{hidden?<EyeOff size={15}/>:<Eye size={15}/>}</button></div><div className="hero-value">{value(v.balance)}</div><div className="hero-details">{[[ArrowDownLeft,'Receitas',v.income],[ArrowUpRight,'Despesas',v.expense]].map(([Icon,label,n])=>{const I=Icon as typeof Wallet;return <div className="metric" key={String(label)}><span className={'metricicon '+(label==='Despesas'?'out':'')}><I size={16}/></span><div><small>{String(label)} do mês</small><strong>{value(Number(n))}</strong></div></div>})}</div></div></section>
}
export function Chart({rows,month}:{rows:Transaction[];month:string}) {
 const [range,setRange]=useState(6),[chosen,setChosen]=useState('')
 const bars=Array.from({length:range},(_,i)=>{const key=monthAt(month,i-range+1);return {key,...totals(rows,key)}})
 const max=Math.max(100,...bars.flatMap(b=>[b.income,b.expense])),unit=10**Math.floor(Math.log10(max/4)),step=Math.ceil(max/4/(unit/4))*(unit/4),top=step*4
 const label=(n:number)=>n>=100000?Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n/100000)+' mil':String(n/100)
 const selected=bars.find(b=>b.key===chosen)
 return <section className="panel chartpanel"><PanelTitle icon={BarChart3} title="Fluxo financeiro" action={<label className="select-wrap"><select aria-label="Período do gráfico" value={range} onChange={e=>{setRange(+e.target.value);setChosen('')}}><option value="6">6 meses</option><option value="3">3 meses</option></select><ChevronDown size={13}/></label>}/><div className="legend"><span><i/>Receitas</span><span><i/>Despesas</span></div><div className="plot"><div className="axis">{[4,3,2,1,0].map(v=><span key={v}>{label(v*step)}</span>)}</div><div className="graph"><div className="gridlines">{[0,1,2,3,4].map(v=><i key={v}/>)}</div><div className="bargroups">{bars.map(b=><button key={b.key} className="bargroup" onClick={()=>setChosen(chosen===b.key?'':b.key)} aria-label={fmt(b.key+'-01',{month:'long'})+', receitas '+money(b.income)+', despesas '+money(b.expense)} aria-pressed={chosen===b.key}><div className="sticks"><i style={{height:(b.income/top*100)+'%'}}/><i style={{height:(b.expense/top*100)+'%'}}/></div><small>{fmt(b.key+'-01',{month:'short'}).replace('.','')}</small></button>)}</div></div></div>{selected&&<div className="chartdetail" role="status">{fmt(selected.key+'-01',{month:'long'})} · Receitas {money(selected.income)} · Despesas {money(selected.expense)}</div>}</section>
}
export function GoalRow({g,click}:{g:Goal;click:()=>void}){const I=({shield:ShieldCheck,plane:Plane,book:BookOpen,flag:Flag}[g.icon]||Target),p=percent(g)
 return <button className="goalrow" onClick={click}><span className={'tile '+g.icon}><I size={20}/></span><span className="goalbody"><span className="goaltop"><b>{g.title}</b><small>{p}%</small></span><span className="track"><i style={{width:p+'%'}}/></span></span></button>
}
export function EventRow({e,click}:{e:Entry;click:()=>void}) {return <button className="eventrow" onClick={click}><span className="datetile"><small>{fmt(e.date,{month:'short'}).replace('.','')}</small><b>{e.date.slice(-2)}</b></span><span className="eventbody"><b>{e.title}</b><small><Clock3 size={13}/>{e.time||'Dia inteiro'}{e.place&&<><span>·</span><MapPin size={13}/>{e.place}</>}</small></span><span className={'tag t'+e.type}>{e.type}</span><ChevronRight className="rightchev" size={16}/></button>}
export function Calendar({date,select,events}:{date:string;select:(s:string)=>void;events:Entry[]}) {
 const [month,setMonth]=useState(date.slice(0,7))
 useEffect(()=>setMonth(date.slice(0,7)),[date])
 const start=localDate(month+'-01'),first=new Date(start.getFullYear(),start.getMonth(),1-start.getDay()),today=dayKey(new Date())
 return <section className="panel calendar"><PanelTitle icon={CalendarDays} title={fmt(month+'-01',{month:'long',year:'numeric'})} action={<div className="flex gap-1"><button className="iconbtn" aria-label="Mês anterior" onClick={()=>setMonth(monthAt(month,-1))}><ChevronLeft size={17}/></button><button className="iconbtn" aria-label="Próximo mês" onClick={()=>setMonth(monthAt(month,1))}><ChevronRight size={17}/></button></div>}/><div className="calgrid">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(w=><strong key={w}>{w}</strong>)}{Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(d.getDate()+i);const k=dayKey(d),count=events.filter(e=>e.date===k).length;return <button key={k} aria-label={fmt(k,{dateStyle:'full'})+(count?', '+count+' registros':'')} aria-pressed={k===date} className={[k.slice(0,7)!==month?'muted':'',k===date?'sel':'',k===today?'today':''].join(' ')} onClick={()=>select(k)}>{d.getDate()}{count>0&&<i/>}</button>})}</div><div className="calfoot"><span><i/> Com compromisso</span><button className="textbtn" onClick={()=>{setMonth(today.slice(0,7));select(today)}}>Hoje</button></div></section>
}
export function CategoryReport({rows}:{rows:Transaction[]}) {
 const cats=new Map<string,number>()
 rows.filter(r=>r.type==='Despesa'&&r.paid).forEach(r=>cats.set(r.category,(cats.get(r.category)||0)+r.cents))
 const total=[...cats.values()].reduce((a,b)=>a+b,0)
 return <section className="panel"><PanelTitle icon={Layers3} title="Despesas por categoria"/>{total?[...cats].sort((a,b)=>b[1]-a[1]).map(([k,v])=><div className="catrow" key={k}><div className="goaltop"><b>{k}</b><span>{money(v)} · {Math.round(v/total*100)}%</span></div><span className="track"><i style={{width:v/total*100+'%'}}/></span></div>):<Empty>Nenhuma despesa paga neste mês.</Empty>}</section>
}
