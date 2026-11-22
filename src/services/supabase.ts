import {endpoint,publicKey} from './config'
import type {Kind,RecordItem} from '../model'
/** Supply a fresh access token from the signed-in user's Supabase Auth session. */
export function remoteRecords(accessToken:()=>Promise<string>) {
  const base=endpoint, key=publicKey
  if(!base||!key)throw Error('Configure o projeto Supabase antes de conectar uma conta.')
  type Row={id:string;kind:Kind;payload:RecordItem;revision:number;deleted:boolean}
  async function request(query:string,method='GET',body?:object):Promise<Row[]> {
    const token=await accessToken()
    if(!token)throw Error('Entre na sua conta para sincronizar.')
    const response=await fetch(base.replace(/\/$/,'')+'/rest/v1/personal_records'+query,{
      method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
      body:body?JSON.stringify(body):undefined
    })
    if(!response.ok)throw Error('Falha na sincronização ('+response.status+').')
    return response.json()
  }
  return {
    async list() {
      const rows:Row[]=[]
      for(let offset=0;;offset+=250) {
        const page=await request('?select=id,kind,payload,revision,deleted&order=kind,id&limit=250&offset='+offset)
        rows.push(...page)
        if(page.length<250)return rows
      }
    },
    async save(kind:Kind,item:RecordItem,revision?:number,deleted=false) {
      const rows=revision===undefined?await request('','POST',{id:item.id,kind,payload:item,deleted}):
        await request('?id=eq.'+encodeURIComponent(item.id)+'&kind=eq.'+kind+'&revision=eq.'+revision,'PATCH',{payload:item,deleted})
      if(!rows.length)throw Error('Este registro mudou em outro dispositivo. Recarregue antes de salvar.')
      return rows[0]
    }
  }
}

