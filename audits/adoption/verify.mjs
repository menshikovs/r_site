import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs'
import {join,relative} from 'node:path'
import {createHash} from 'node:crypto'
import {cleanOfficialHtml} from '../../src/cran-data.mjs'
const out='audits/adoption/2026-10-29',read=p=>JSON.parse(readFileSync(join(out,p),'utf8').replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex')
const inventory=read('inventory.json'),prototype=read('prototype-results.json'),build=read('build-result.json'),resources=read('build-resources.json'),check=read('check-result.json')
assert.ok(check.passed);assert.equal(resources.exitCode,0);assert.equal(prototype.results.length,18)
assert.ok(prototype.results.find(r=>r.name==='Rollback and native integrity')?.originalCorpusHashesUnchanged)
const current=[]
function walk(dir,root,files){for(const n of readdirSync(dir).sort()){const p=join(dir,n);if(statSync(p).isDirectory())walk(p,root,files);else{const b=readFileSync(p);files.push({path:relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)})}}}
walk('dist','dist',current)
assert.equal(hash(JSON.stringify(current)),inventory.production.sha256)
for(const [path,digest] of Object.entries(inventory.source))assert.equal(hash(readFileSync(path)),digest,path)
assert.equal(readFileSync(out+'/native-before.sha256','utf8'),readFileSync(out+'/native-after.sha256','utf8'))
const input='<body><p>Controlled review fixture</p><a href=javascript:alert(1)>test</a><object data="https://example.invalid/object"></object></body>'
const output=cleanOfficialHtml(input,'https://cran.r-project.org/faqs.html')
writeFileSync(out+'/sanitizer-review.json',JSON.stringify({scope:'Controlled transformation only; nothing executed; no evidence of exploitation on CRAN',input,output,unquotedJavascriptHrefRetained:output.includes('href=javascript:'),objectElementRetained:output.includes('<object')},null,2))
const treeCpuMs=resources.lastProcessSamples.reduce((n,p)=>n+p.cpuMs,0)
const peakWorkingSet=Math.max(...resources.samples.map(s=>s.processes.reduce((n,p)=>n+p.workingSet,0)))
const old=new Map(inventory.production.files.map(f=>[f.path,f]))
const result={prototypeChecks:18,fullCandidateCheckPassed:true,productionDistHashUnchanged:true,productionSourceHashesUnchanged:true,originalCorpusFiles:inventory.original.files.length,originalCorpusHashesUnchanged:true,generatedFiles:inventory.generated.files.length,htmlFiles:inventory.generated.files.filter(f=>/\.html?$/.test(f.path)).length,generatedBytes:inventory.generated.totalBytes,changedGeneratedFiles:inventory.generated.files.filter(f=>old.has(f.path)&&old.get(f.path).sha256!==f.sha256).length,buildWallMs:build.wallMs,sampledProcessTreeCpuLowerBoundMs:treeCpuMs,sampledPeakSummedWorkingSet:peakWorkingSet,canonicalLocationsAreLocalModel:true,fullIntegrationApproved:false}
writeFileSync(out+'/final-verification.json',JSON.stringify(result,null,2))
const files=[];walk(out,out,files)
writeFileSync(out+'/artifact-manifest.json',JSON.stringify({files:files.filter(f=>f.path!=='artifact-manifest.json')},null,2))
console.log(JSON.stringify(result,null,2))
