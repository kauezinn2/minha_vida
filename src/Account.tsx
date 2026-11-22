import { useState, type FormEvent } from 'react'
import { pairingCode, signIn, signOut, type Session } from './services/auth'
export function Account({current, openLogin}:{current:Session|null;openLogin:boolean}) {
 const [signup,setSignup]=useState(false)
 const [code,setCode]=useState('')
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 async function submit(event:FormEvent<HTMLFormElement>) {
   event.preventDefault()
   if (busy) return
   const fields=new FormData(event.currentTarget)
   setBusy(true);setStatus('')
   try {
     const active=await signIn(String(fields.get('email')).trim(),String(fields.get('password')),signup)
     if (!active) setStatus('Confira seu e-mail e confirme o cadastro. Depois entre com sua senha.')
   } catch (error) { setStatus(error instanceof Error ? error.message : 'Falha ao entrar.') }
   finally {setBusy(false)}
 }
 if (current) return <div className="settingsblock"><div><b>Conta conectada</b><p>{current.user.email}</p><p>Use esta conta no iPhone e no Windows para acessar os mesmos dados.</p><button className="secondary" disabled={busy} onClick={async()=>{
   setBusy(true);setStatus('')
   try {setCode(await pairingCode(current.user.id))}catch(e){setStatus(e instanceof Error?e.message:'Falha ao gerar código.')}finally{setBusy(false)}
 }}>Vincular ao ChatGPT</button>{code&&<p>Envie este código na conversa do Minha Vida em até 10 minutos: <code>{code}</code></p>}{status&&<p role="status">{status}</p>}<br/><button className="textbtn" onClick={signOut}>Sair da conta neste aparelho</button></div></div>
 if (!openLogin) return null
 return <form onSubmit={submit}><h3>{signup?'Criar conta':'Conectar minha conta'}</h3><label className="field"><span>E-mail</span><input type="email" name="email" required autoComplete="email"/></label><label className="field"><span>Senha</span><input type="password" name="password" required minLength={signup?8:1} autoComplete={signup?'new-password':'current-password'}/></label>{status&&<p role="status" className="dialogcopy">{status}</p>}<div className="actions"><button type="button" className="textbtn" onClick={()=>{setSignup(!signup);setStatus('')}}>{signup?'Já tenho conta':'Criar conta'}</button><button disabled={busy} className="primary">{busy?'Aguarde…':signup?'Cadastrar':'Entrar'}</button></div></form>
}

