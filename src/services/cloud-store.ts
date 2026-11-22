import {blank, type Kind, type RecordItem, type State} from '../model'
import {remoteRecords} from './supabase'
import {sessionKey, tokenFor} from './auth'

const kinds:Kind[] = ['transactions','goals','events']
type Row = {kind:Kind;id:string;payload:RecordItem;revision:number;deleted:boolean}
type Change = {kind:Kind;id:string;payload:RecordItem;deleted:boolean;base?:number;conflict?:boolean}
type Cache = {rows:Row[]; pending:Change[]; lastSync:number}
const matches = (a:{kind:Kind;id:string},b:{kind:Kind;id:string})=>a.kind===b.kind && a.id===b.id
function equal(a:unknown,b:unknown):boolean {
  if(a===b)return true
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false
  const left=Object.entries(a),right=b as Record<string,unknown>
  return left.length===Object.keys(right).length && left.every(([key,value])=>Object.hasOwn(right,key)&&equal(value,right[key]))
}
const applied=(change:Change,row?:Row)=>Boolean(row && row.deleted===change.deleted && (change.deleted||equal(row.payload,change.payload)))
function visible(cache:Cache):State {
  const result=blank()
  for (const row of [...cache.rows.filter(r=>!cache.pending.some(p=>matches(p,r))),...cache.pending]) {
    if(!row.deleted)(result[row.kind] as RecordItem[]).push(row.payload)
  }
  return result
}

export function cloudStore(userId:string) {
  const key=sessionKey+':records:'+userId
  const api=remoteRecords(()=>tokenFor(userId))
  const read=():Cache=>JSON.parse(localStorage.getItem(key)||'{"rows":[],"pending":[],"lastSync":0}')
  const write=(c:Cache)=>{localStorage.setItem(key,JSON.stringify(c));window.dispatchEvent(new Event('minha-vida-records'))}
  async function synchronize() {
    let cache=read()
    const rows=await api.list()
    cache=read()
    cache.rows=rows
    const todo=cache.pending.slice()
    write(cache)
    for(const change of todo) {
      if(change.conflict) continue
      cache=read()
      if(!cache.pending.some(p=>equal(p,change))) continue
      const existing=cache.rows.find(r=>matches(change,r))
      let saved=existing
      const conflict=!applied(change,existing) && existing?.revision!==change.base
      if(!conflict && !applied(change,existing)) saved=await api.save(change.kind,change.payload,change.base,change.deleted)
      cache=read()
      const current=cache.pending.find(p=>matches(p,change))
      if(saved) cache.rows=[...cache.rows.filter(r=>!matches(r,saved!)),saved]
      if(current) {
        if(conflict) current.conflict=true
        else if(equal(current,change)) cache.pending=cache.pending.filter(p=>p!==current)
        else current.base=saved?.revision
      }
      write(cache)
    }
    cache=read();cache.lastSync=Date.now();write(cache)
  }
  return {
    key,read,state:()=>visible(read()),
    mutate(fn:(s:State)=>State) {
      const cache=read(), before=visible(cache), after=fn(before)
      for(const kind of kinds){
        const old=new Map<string,RecordItem>(before[kind].map(r=>[r.id,r]))
        const next=new Map<string,RecordItem>(after[kind].map(r=>[r.id,r]))
        for(const id of new Set([...old.keys(),...next.keys()])){
          const prior=old.get(id),item=next.get(id)
          if(equal(prior,item))continue
          const record={id,kind},pending=cache.pending.find(p=>matches(p,record))
          if(pending?.conflict)throw Error('Resolva o conflito antes de editar este registro.')
          const row=cache.rows.find(r=>matches(r,record))
          const change={...record,payload:(item||prior)!,deleted:!item,base:pending?pending.base:row?.revision}
          cache.pending=[...cache.pending.filter(p=>!matches(p,record)),change]
        }
      }
      write(cache);return visible(cache)
    },
    resolve(change:Change,keepLocal:boolean) {
      const cache=read(), pending=cache.pending.find(p=>matches(p,change))
      if(!pending?.conflict)return
      if(keepLocal){pending.base=cache.rows.find(r=>matches(r,change))?.revision;pending.conflict=false}
      else cache.pending=cache.pending.filter(p=>p!==pending)
      write(cache)
    },
    sync:()=>navigator.locks ? navigator.locks.request(key+':sync',{ifAvailable:true},lock=>lock?synchronize():undefined) : synchronize()
  }
}

