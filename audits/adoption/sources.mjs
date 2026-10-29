import {mkdirSync,writeFileSync,readFileSync,existsSync,copyFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
const out='audits/adoption/2026-10-29',base='audits/adoption/.cache/original'
mkdirSync(out,{recursive:true});mkdirSync(base,{recursive:true})
if(existsSync(join(out,'http-audit.json')))throw Error('Use a fresh audit directory')
execFileSync('tar',['-xzf','benchmarks/results/2026-10-28/original-snapshot.tar.gz','-C',base])
const sources=[];let requests=0
const pause=()=>new Promise(resolve=>setTimeout(resolve,600))
const fetchSmall=async(path,method='GET')=>{
  if(++requests>65)throw Error('Bounded audit cap exceeded')
  const url='https://cran.r-project.org'+path
  try{
    const response=await fetch(url,{method,redirect:'manual',signal:AbortSignal.timeout(12000)})
    const bytes=method==='GET'?Buffer.from(await response.arrayBuffer()):Buffer.alloc(0)
    if(bytes.length>8000000)throw Error('Resource exceeded bounded snapshot size')
    const row={path,url,method,status:response.status,location:response.headers.get('location'),headers:Object.fromEntries(response.headers),bytes:bytes.length,at:new Date().toISOString()}
    if(method==='GET'&&response.ok){const file=join(base,path);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,bytes);row.sha256=createHash('sha256').update(bytes).digest('hex')}
    return row
  }catch(error){return{path,url,method,error:error.message}}
  finally{await pause()}
}
for(const path of ['/mirror-howto.html','/src/contrib/PACKAGES.rds','/bin/windows/contrib/4.6/PACKAGES.rds','/web/packages/termr/termr.pdf','/web/packages/termr/LICENSE','/web/packages/termr/readme/README.html','/web/packages/termr/news/news.html']){
  sources.push(await fetchSmall(path));writeFileSync(join(out,'snapshot-additions.json'),JSON.stringify(sources,null,2));console.log('snapshot',path,sources.at(-1).status||sources.at(-1).error)
}
const paths=['/','/bin/windows/','/bin/macosx/','/bin/linux/','/web/packages/','/web/packages/termr/index.html','/package=termr','/package=termr&version=1.0.1','/package=ggplot2&version=4.0.2','/package=termr&version=0.0.0','/src/contrib/','/src/contrib/PACKAGES','/src/contrib/PACKAGES.gz','/src/contrib/PACKAGES.rds','/src/contrib/termr_1.0.1.tar.gz','/bin/windows/contrib/4.6/PACKAGES.rds','/bin/windows/contrib/4.6/termr_1.0.1.zip','/bin/macosx/sonoma-arm64/contrib/4.6/PACKAGES.rds','/manuals.html','/doc/manuals/r-release/R-intro.html','/web/checks/check_results_termr.html','/src/contrib/Archive/ggplot2/','/web/views/','/web/packages/ggplot2/vignettes/ggplot2.html','/web/packages/termr/readme/README.html','/web/packages/termr/news/news.html','/web/packages/termr/termr.pdf','/assets/site.css']
const audit=[]
for(const path of paths){audit.push(await fetchSmall(path,'HEAD'));writeFileSync(join(out,'http-audit.json'),JSON.stringify({requestCap:65,requests,redirects:'Recorded without automatically following; no archive/binary body download',results:audit},null,2));console.log('HEAD',path,audit.at(-1).status||audit.at(-1).error)}
