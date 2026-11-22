import fs from 'node:fs/promises'
import path from 'node:path'
const asData = async (name,type) => 'data:'+type+';base64,'+(await fs.readFile('dist/'+name)).toString('base64')
let html=await fs.readFile('dist/index.html','utf8')
const jsPath=html.match(/src="(\/assets\/[^"]+\.js)"/)[1]
const cssPath=html.match(/href="(\/assets\/[^"]+\.css)"/)[1]
let js=await fs.readFile('dist'+jsPath,'utf8'), css=await fs.readFile('dist'+cssPath,'utf8')
const logo=await asData('marca.svg','image/svg+xml'), landscape=await asData('serra.svg','image/svg+xml')
js=js.replaceAll('"/marca.svg"',JSON.stringify(logo))
css=css.replaceAll('/serra.svg',landscape)
html=html.replace(/<link[^>]*rel="(?:manifest|apple-touch-icon)"[^>]*>/g,'').replace('/marca.svg',logo)
html=html.replace(/<link[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,()=>'<style>'+css+'</style>')
html=html.replace(/<script[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/,'')
html=html.replace('</body>',()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>')
const dest=path.resolve(process.argv[2]||'../outputs/Minha-Vida.html')
await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,html)
console.log(dest)

