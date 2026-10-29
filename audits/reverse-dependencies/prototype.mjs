import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'
import { parseDcf, parseReverseDependencies, REVERSE_CATEGORIES } from '../../src/cran-data.mjs'
import { renderPackage, renderReverseDependencies } from '../../src/templates.mjs'
const out='audits/reverse-dependencies/2026-10-29'
const start=performance.now()
const records=parseDcf(readFileSync(join(out,'prototype.dcf'),'utf8'))
const packageNames=new Set(records.map(r=>r.Package))
const parsed=new Map(records.map(r=>[r.Package,parseReverseDependencies(r)]))
const validatedMs=performance.now()-start
const official=JSON.parse(readFileSync('audits/functional-parity/2026-10-29/official-structure.json','utf8'))
const rows=[];const generationStart=performance.now()
for(const name of ['ggplot2','data.table','Rcpp','termr','MASS']){
  const record=records.find(r=>r.Package===name),reverseDependencies=parsed.get(name)
  const counts=Object.fromEntries(REVERSE_CATEGORIES.map(c=>[c.id,reverseDependencies[c.id].length]))
  const page=official.find(p=>p.name===name)
  for(const {field,id} of REVERSE_CATEGORIES){
    const expected=page.rows.find(r=>r.label===field)?.links.map(l=>l.text.trim())||[]
    assert.deepEqual([...reverseDependencies[id]].sort(),expected.sort(),`${name} ${id} differs from saved official page`)
  }
  const dir=join(out,'prototype','web/packages',name);mkdirSync(dir,{recursive:true})
  const before=readFileSync(`dist/web/packages/${name}/index.html`)
  copyFileSync(`dist/web/packages/${name}/index.html`,join(out,`${name}-before.html`))
  const main=renderPackage(record,{packageNames,reverseDependencies})
  writeFileSync(join(dir,'index.html'),main)
  const nonempty=Object.values(counts).some(n=>n>0)
  const full=nonempty?renderReverseDependencies(record,{packageNames,reverseDependencies}):null
  if(full)writeFileSync(join(dir,'reverse-dependencies.html'),full)
  rows.push({name,counts,beforeBytes:before.length,mainBytes:Buffer.byteLength(main),mainGzip:gzipSync(main).length,reverseBytes:full?Buffer.byteLength(full):0,reverseGzip:full?gzipSync(full).length:0,mainLinks:(main.match(/<a\b/g)||[]).length,reverseLinks:full?(full.match(/<a\b/g)||[]).length:0,externalNames:REVERSE_CATEGORIES.flatMap(c=>reverseDependencies[c.id]).filter(n=>!packageNames.has(n)).length})
}
const top=records.map(r=>({name:r.Package,edges:REVERSE_CATEGORIES.reduce((n,c)=>n+parsed.get(r.Package)[c.id].length,0)})).sort((a,b)=>b.edges-a.edges).slice(0,5)
writeFileSync(join(out,'prototype-results.json'),JSON.stringify({records:records.length,validatedMs,generationMs:performance.now()-generationStart,rows,top,officialListsMatch:true},null,2))
console.log(JSON.stringify({validatedMs,rows,top},null,2))
