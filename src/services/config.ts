import project from './project.json'
export const endpoint = (import.meta.env.VITE_SUPABASE_URL || project.url).replace(/\/$/,'')
export const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || project.publishableKey

