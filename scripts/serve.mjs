import http from 'node:http'
import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('../dist/', import.meta.url))
const files = new Map()
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' }
for (const entry of await readdir(directory, {recursive:true,withFileTypes:true})) {
  if (!entry.isFile()) continue
  const diskPath = path.join(entry.parentPath, entry.name)
  const url = '/' + path.relative(directory, diskPath).split(path.sep).join('/')
  files.set(url, {bytes:await readFile(diskPath), type:types[path.extname(entry.name)] || 'application/octet-stream'})
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const file = files.get(pathname === '/' ? '/index.html' : pathname)
  if (!file || !['HEAD','GET'].includes(request.method)) {
    response.writeHead(file ? 405 : 404).end()
    return
  }
  response.writeHead(200, {'Content-Type':file.type,'Cache-Control':'no-cache'})
  response.end(request.method === 'HEAD' ? undefined : file.bytes)
})
server.on('error', error => { console.error(error.message); process.exitCode=1 })
server.listen(4173,'127.0.0.1',()=>console.log('Minha Vida está disponível em http://127.0.0.1:4173/'))

