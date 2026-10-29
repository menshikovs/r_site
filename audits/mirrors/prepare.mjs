import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { portableHtml } from '../../src/static-urls.mjs'
import { buildSite } from '../../scripts/build.mjs'
import { REVERSE_CATEGORIES } from '../../src/cran-data.mjs'
import { annotateArchivedProvenance } from './archived-html.mjs'

const out='audits/mirrors/2026-10-29', cache='audits/mirrors/.cache'
mkdirSync(out,{recursive:true}); mkdirSync(cache,{recursive:true})
const sha=b=>createHash('sha256').update(b).digest('hex')
const fixture=(name, title=name)=>({Package:name, Version:'1.0.0',Title:title,Description:'Local controlled deployment fixture; not a CRAN release.',...Object.fromEntries(REVERSE_CATEGORIES.map(c=>[c.field,'']))})
const a=[fixture('ggplot2'),fixture('termr'),fixture('plotly'),fixture('plotrix'),fixture('RetiredAuditPackage')]
a[0]['Reverse imports']='termr, RetiredAuditPackage'
const b=a.filter(p=>p.Package!=='RetiredAuditPackage').map(p=>({...p}))
b[0].Title='Controlled metadata update'; b[0]['Reverse imports']='termr, AddedAuditPackage'; b.push(fixture('AddedAuditPackage'))
writeFileSync(out+'/fixtures.json',JSON.stringify({scope:'Synthetic controlled metadata fixtures, never official package releases',a,b},null,2))
const mirrors=Array.from({length:10},(_,i)=>({country:'Fixture',url:`https://example.org/mirror${i}/`,description:'local test fixture'}))
for(const [release,records] of [['a',a],['b',b]]) buildSite({records,mirrors,pages:{source_base:'<html><body><p>Local source listing fixture</p></body></html>'},outDir:cache+'/'+release,minimumPackages:1,mirrorResources:true})
// Full real generated corpus from the earlier audited official snapshot. No
// network refresh and no replacement of production dist. Apply the same writer.
const baseline='audits/adoption/.cache/generated', target=cache+'/full'
const files=[]
function walk(dir,rel='') {for(const name of readdirSync(dir)){const path=join(dir,name),route=rel+name;if(statSync(path).isDirectory())walk(path,route+'/');else{let bytes=readFileSync(path); if(/\.html?$/i.test(route))bytes=Buffer.from(portableHtml(annotateArchivedProvenance(bytes.toString()),route,{mirrorResources:true}));if(route==='assets/search.js')bytes=readFileSync('public/search.js');mkdirSync(join(target,rel),{recursive:true});writeFileSync(join(target,route),bytes);files.push({path:route,bytes:bytes.length,sha256:sha(bytes)})}}}
walk(baseline)
writeFileSync(out+'/full-manifest.json',JSON.stringify({scope:'Existing full official-data output, passed through current portable writer; not a fresh complete build',files,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2))
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}))
