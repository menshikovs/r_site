import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { parseDcf } from '../../src/cran-data.mjs'
const root='audits/functional-parity/2026-10-29'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const records=parseDcf(readFileSync(join(root,'representative-utf8.dcf'),'utf8'))
const qa=read(join(root,'browser-qa.json'))
const normalize=x=>String(x||'').replace(/\s+/g,' ').trim()
const fields={Authors:'Author',Maintainer:'Maintainer',License:'License',Published:'Date/Publication',Priority:'Priority',Contact:'Contact',DOI:'DOI',Requires:'Depends',Imports:'Imports',Suggests:'Suggests','Linking to':'LinkingTo',Enhances:'Enhances','System requirements':'SystemRequirements','Needs compilation':'NeedsCompilation','Operating system':'OS_type',Architectures:'Archs','Additional repositories':'Additional_repositories','Project URL':'URL','Bug reports':'BugReports'}
const comparisons=[]
for(const record of records){
  const row=qa.find(r=>r.name===record.Package&&r.width===390)
  assert.ok(row)
  assert.equal(normalize(row.packageTitle),normalize(record.Title))
  assert.equal(normalize(row.description),normalize(record.Description))
  assert.equal(row.version,record.Version)
  for(const [label,field] of Object.entries(fields))assert.equal(normalize(row.details[label]),normalize(record[field]),`${record.Package} ${label}`)
  comparisons.push({name:record.Package,identityAndDescriptionMatch:true,displayedFieldsMatch:true,authorsCharacters:record.Author.length,reverseCounts:Object.fromEntries(['Reverse depends','Reverse imports','Reverse linking to','Reverse suggests','Reverse enhances'].map(k=>[k,record[k]?record[k].split(',').filter(x=>x.trim()).length:0]))})
}
assert.equal(qa.length,31)
const status=read(join(root,'validation-status.json'));assert.ok(status.every(r=>r.exitCode===0))
const source=read(join(root,'sources.json'));const hash=b=>createHash('sha256').update(b).digest('hex')
assert.ok(source.every(r=>r.status===200&&hash(readFileSync(join(root,r.file)))===r.sha256))
const official=read(join(root,'official-structure.json'))
for(const row of comparisons){
  const page=official.find(p=>p.name===row.name)
  for(const [label,count] of Object.entries(row.reverseCounts))assert.equal(page.rows.find(r=>r.label===label)?.links.length||0,count,`${row.name} ${label} count`)
}
const previous=read('benchmarks/results/2026-10-29-optimization/input-integrity.json')
for(const path of ['src/site.css','public/search.js'])assert.equal(hash(readFileSync(path)),previous.sourceFiles.find(r=>r.path===path).sha256)
writeFileSync(join(root,'final-verification.json'),JSON.stringify({comparisons,qaRecords:qa.length,allRequiredCommandsPassed:true,sourceHashesMatch:true,cssAndSearchScriptUnchanged:true,reverseSystemNotImplemented:true},null,2))
const files=[]
function walk(dir){for(const name of readdirSync(dir).sort()){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else if(name!=='artifact-manifest.json')files.push({path:relative(root,path).replaceAll('\\','/'),bytes:statSync(path).size,sha256:hash(readFileSync(path))})}}
walk(root)
writeFileSync(join(root,'artifact-manifest.json'),JSON.stringify({files},null,2))
console.log(JSON.stringify({comparisons,qaRecords:qa.length,files:files.length},null,2))
