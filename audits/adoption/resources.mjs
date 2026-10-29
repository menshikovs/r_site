import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {createHash} from 'node:crypto'
const out='audits/adoption/2026-10-29',base='audits/adoption/.cache/original'
const paths=['/src/contrib/termr_1.0.1.tar.gz','/src/contrib/Archive/uuid/uuid_1.2-1.tar.gz','/bin/windows/contrib/4.6/termr_1.0.1.zip','/bin/macosx/sonoma-arm64/contrib/4.6/PACKAGES.rds','/web/checks/check_results_termr.html','/web/views/index.html','/web/packages/ggplot2/vignettes/ggplot2.html']
const rows=[]
for(const path of paths){
  try{
    const r=await fetch('https://cran.r-project.org'+path,{signal:AbortSignal.timeout(15000)})
    if(!r.ok)throw Error(`HTTP ${r.status}`)
    const chunks=[];let bytes=0
    for await(const chunk of r.body){bytes+=chunk.length;if(bytes>8000000){await r.body.cancel().catch(()=>{});throw Error('8 MB bounded body cap exceeded')}chunks.push(chunk)}
    const body=Buffer.concat(chunks),file=join(base,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,body)
    rows.push({path,url:r.url,status:r.status,bytes,sha256:createHash('sha256').update(body).digest('hex')})
  }catch(error){rows.push({path,error:error.message})}
  writeFileSync(join(out,'resource-bodies.json'),JSON.stringify(rows,null,2));console.log(rows.at(-1));await new Promise(resolve=>setTimeout(resolve,600))
}
for(const url of ['https://cran.r-project.org/src/contrib/Archive/termr/termr_0.0.0.tar.gz']){
  const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(12000)});writeFileSync(join(out,'invalid-version-final.json'),JSON.stringify({url,status:r.status,finalUrl:r.url},null,2))
}
