import assert from 'node:assert/strict'
import {readFileSync,readdirSync,statSync,writeFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const out='audits/reverse-dependencies/2026-10-29'
const snapshot=JSON.parse(readFileSync(join(out,'full/snapshot.json'),'utf8'))
assert.equal(createHash('sha256').update(readFileSync(join(out,'full/packages.rds'))).digest('hex'),snapshot.sha256)
const fields=['depends','imports','linking-to','suggests','enhances']
const source=readFileSync(join(out,'full/expected.tsv'),'utf8').trimEnd().split(/\r?\n/).slice(1).map(line=>{const [name,...cells]=line.split('\t');return{name,lists:fields.map((_,i)=>cells[i]?.trim()?cells[i].trim().split(' '):[])}})
const known=new Set(source.map(r=>r.name))
let reversePages=0,edges=0,externalEdges=0,reverseBytes=0,reverseGzipBytes=0,summaryBytes=0,summaryGzipIncrement=0,mainBytes=0,top={name:'',edges:0}
const representatives=[]
for(const row of source){
  const file=`dist/web/packages/${row.name}/index.html`,main=readFileSync(file,'utf8')
  const section=main.match(/<section class="panel reverse-summary"[\s\S]*?<\/section>/)?.[0]
  assert.ok(section,`No summary for ${row.name}`)
  summaryBytes+=Buffer.byteLength(section);mainBytes+=Buffer.byteLength(main)
  summaryGzipIncrement+=gzipSync(main).length-gzipSync(main.replace(section,'')).length
  const counts=[...main.matchAll(/<dd data-reverse-category="([^"]+)">(\d+)<\/dd>/g)]
  assert.deepEqual(counts.map(c=>c[1]),fields)
  assert.deepEqual(counts.map(c=>Number(c[2])),row.lists.map(a=>a.length),`${row.name} RDS/main counts`)
  const total=row.lists.reduce((n,a)=>n+a.length,0)
  if(total>top.edges)top={name:row.name,edges:total}
  const reverseFile=`dist/web/packages/${row.name}/reverse-dependencies.html`
  assert.equal(existsSync(reverseFile),total>0,`${row.name} page presence`)
  if(total){
    const full=readFileSync(reverseFile,'utf8');reversePages++;reverseBytes+=Buffer.byteLength(full);reverseGzipBytes+=gzipSync(full).length
    for(let i=0;i<fields.length;i++){
      const content=new RegExp(`<section id="${fields[i]}" class="panel reverse-section">([\\s\\S]*?)</section>`).exec(full)[1]
      const names=[...content.matchAll(/<li>(?:<a [^>]+>|<span [^>]+>)([^<]+)<\/(?:a|span)><\/li>/g)].map(m=>m[1])
      assert.deepEqual([...names].sort(),[...row.lists[i]].sort(),`${row.name} ${fields[i]} complete source list`)
      assert.equal(new Set(names).size,names.length)
      for(const name of names)externalEdges+=Number(!known.has(name))
    }
  }
  edges+=total
  if(['ggplot2','data.table','Rcpp','termr','MASS','testthat'].includes(row.name))representatives.push({name:row.name,counts:Object.fromEntries(fields.map((f,i)=>[f,row.lists[i].length])),mainBytes:Buffer.byteLength(main),mainGzipBytes:gzipSync(main).length,reverseBytes:total?statSync(reverseFile).size:0})
}
let files=0,totalBytes=0,htmlFiles=0
function walk(dir){for(const name of readdirSync(dir)){const file=join(dir,name),s=statSync(file);if(s.isDirectory())walk(file);else{files++;totalBytes+=s.size;htmlFiles+=Number(/\.html?$/.test(name))}}}
walk('dist')
assert.equal(source.length,snapshot.packages)
const result={snapshotSha256:snapshot.sha256,packages:source.length,reversePages,edges,externalEdges,reverseBytes,reverseGzipBytes,summaryBytes,summaryGzipIncrement,addedFeatureBytes:reverseBytes+summaryBytes,addedFeatureGzipEstimate:reverseGzipBytes+summaryGzipIncrement,mainBytes,files,htmlFiles,totalBytes,top,representatives,allSourceListsAndCountsMatch:true}
writeFileSync(join(out,'full-results.json'),JSON.stringify(result,null,2))
console.log(JSON.stringify({...result,representatives:undefined},null,2))
