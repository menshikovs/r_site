// Bounded acquisition of five representative pages and the existing build's index.
import { mkdirSync, writeFileSync, existsSync, copyFileSync, statSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const output='audits/functional-parity/2026-10-29'
mkdirSync(output,{recursive:true})
if(existsSync(join(output,'sources.json')))throw Error('Recorded audit exists; use a fresh directory')
const sources=[]
for(const name of ['ggplot2','data.table','Rcpp','termr','MASS','packages.rds']) {
  const url=name==='packages.rds'?'https://cran.r-project.org/web/packages/packages.rds':`https://cran.r-project.org/web/packages/${name}/index.html`
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)})
  const bytes=Buffer.from(await response.arrayBuffer())
  const file=name==='packages.rds'?name:`${name}-official.html`
  writeFileSync(join(output,file),bytes)
  sources.push({url,finalUrl:response.url,status:response.status,bytes:bytes.length,file,headers:Object.fromEntries(response.headers),sha256:createHash('sha256').update(bytes).digest('hex'),at:new Date().toISOString()})
  if(name!=='packages.rds'&&existsSync(`dist/web/packages/${name}/index.html`))copyFileSync(`dist/web/packages/${name}/index.html`,join(output,`${name}-before.html`))
  writeFileSync(join(output,'sources.json'),JSON.stringify(sources,null,2))
  console.log(name,response.status,bytes.length)
  if(!response.ok)throw Error(`HTTP ${response.status}: ${url}`)
  await new Promise(resolve=>setTimeout(resolve,600))
}
let files=0,html=0,bytes=0
function walk(dir){for(const n of readdirSync(dir)){const p=join(dir,n),s=statSync(p);if(s.isDirectory())walk(p);else{files++;html+=Number(/\.html?$/.test(n));bytes+=s.size}}}
walk('dist')
writeFileSync(join(output,'dist-before.json'),JSON.stringify({files,html,bytes,at:new Date().toISOString()},null,2))
