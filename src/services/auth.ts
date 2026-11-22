import {endpoint, publicKey} from './config'
export const configured = Boolean(endpoint && publicKey)
export const sessionKey = 'minha-vida:auth:' + endpoint
export type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string } }

export function session(): Session | null {
  const raw = localStorage.getItem(sessionKey)
  return raw && configured ? JSON.parse(raw) : null
}

async function authRequest(path: string, payload: object) {
  const response = await fetch(endpoint + '/auth/v1/' + path, {
    method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.msg || result.error_description || 'Falha na autenticação.')
  return result
}

function storeSession(value: Session & { expires_in?: number }) {
  if (!value.user?.id || !value.refresh_token || !value.access_token) throw new Error('Sessão inválida.')
  value.expires_at ||= Math.floor(Date.now()/1000) + (value.expires_in || 3600)
  localStorage.setItem(sessionKey, JSON.stringify(value))
  window.dispatchEvent(new Event('minha-vida-session'))
}

export async function signIn(email: string, password: string, signup: boolean) {
  const redirect = encodeURIComponent(location.origin + location.pathname)
  const value = await authRequest(signup ? 'signup?redirect_to=' + redirect : 'token?grant_type=password', { email, password })
  if (value.access_token) { storeSession(value); return true }
  return false
}

export function signOut() {
  const prev = session()
  localStorage.removeItem(sessionKey)
  window.dispatchEvent(new Event('minha-vida-session'))
  if (prev) void fetch(endpoint+'/auth/v1/logout?scope=local', {method:'POST', headers:{apikey:publicKey,Authorization:'Bearer '+prev.access_token}}).catch(()=>{})
}

export async function tokenFor(userId: string): Promise<string> {
  const get = async () => {
    const current = session()
    if (current?.user.id !== userId) throw new Error('Entre novamente na sua conta.')
    if (current.expires_at > Date.now()/1000 + 60) return current.access_token
    const next = await authRequest('token?grant_type=refresh_token', {refresh_token:current.refresh_token})
    if (session()?.user.id !== userId || next.user?.id !== userId) throw new Error('A conta mudou.')
    storeSession(next)
    return next.access_token as string
  }
  return navigator.locks ? navigator.locks.request(sessionKey + ':refresh',get) : get()
}


export async function pairingCode(userId:string):Promise<string> {
  const token=await tokenFor(userId)
  const result=await fetch(endpoint+'/rest/v1/rpc/minha_vida_codigo',{
    method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'
  })
  if(!result.ok)throw new Error('Não foi possível gerar o código. Confira sua conexão.')
  return result.json()
}
