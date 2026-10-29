import { readFileSync, writeFileSync } from 'node:fs'
const root='audits/functional-parity/2026-10-29'
const pages=JSON.parse(readFileSync(`${root}/official-structure.json`,'utf8'))
const targets=[]
const add=(name,kind,url)=>targets.push({name,kind,url})
for(const page of pages){
  const base=`https://cran.r-project.org/web/packages/${page.name}/index.html`
  for(const label of ['Package source','Reference manual']) {
    const row=page.rows.find(r=>r.label===label)
    const link=label==='Reference manual'?row?.links.find(l=>/\.pdf$/.test(l.href)):row?.links[0]
    if(link)add(page.name,label,new URL(link.href,base).href)
  }
  add(page.name,'currently generated vignette directory',new URL('vignettes/',base).href)
}
for(const name of ['termr','MASS']){
  const p=pages.find(p=>p.name===name),base=`https://cran.r-project.org/web/packages/${name}/index.html`
  add(name,'canonical short form',p.canonical)
  add(name,'checks',new URL(p.rows.find(r=>r.label==='CRAN checks').links[0].href,base).href)
}
for(const label of ['Materials','BugReports','URL','License']) {
  const p=pages.find(p=>p.name==='termr'),base='https://cran.r-project.org/web/packages/termr/index.html'
  for(const link of p.rows.find(r=>r.label===label).links)add('termr',label,new URL(link.href,base).href)
}
add('ggplot2','archive','https://cran.r-project.org/src/contrib/Archive/ggplot2/')
add('termr','hypothetical archive (not linked by official page)','https://cran.r-project.org/src/contrib/Archive/termr/')
const results=[];let count=0
for(const target of targets){
  let url=target.url; const chain=[]
  for(let redirects=0;redirects<4;redirects++){
    if(++count>45)throw Error('Request cap exceeded')
    try{
      const r=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000)})
      chain.push({url,status:r.status,location:r.headers.get('location'),contentLength:r.headers.get('content-length'),type:r.headers.get('content-type')})
      await new Promise(resolve=>setTimeout(resolve,600))
      if(r.status>=300&&r.status<400&&r.headers.get('location')){url=new URL(r.headers.get('location'),url).href;continue}
    }catch(error){chain.push({url,error:error.message})}
    break
  }
  results.push({...target,chain})
  writeFileSync(`${root}/link-checks.json`,JSON.stringify({method:'HEAD only; no PDF/tarball bodies downloaded',maxRequests:45,requests:count,results},null,2))
  console.log(target.name,target.kind,chain.at(-1).status??chain.at(-1).error)
}
