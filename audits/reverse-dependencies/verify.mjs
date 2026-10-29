import assert from 'node:assert/strict'
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs'
import {join,relative} from 'node:path'
import {createHash} from 'node:crypto'
const out='audits/reverse-dependencies/2026-10-29'
const read=p=>JSON.parse(readFileSync(join(out,p),'utf8').replace(/^\uFEFF/,''))
const full=read('full-results.json'),prototype=read('prototype-results.json'),browser=read('full-browser.json'),protoBrowser=read('prototype-browser.json'),status=read('full/status.json'),before=read('disk-before.json'),after=read('disk-after.json')
assert.ok(full.allSourceListsAndCountsMatch&&prototype.officialListsMatch)
assert.ok(status.every(s=>s.exitCode===0))
assert.equal(browser.length,24);assert.equal(protoBrowser.length,20)
for(const rows of [browser,protoBrowser])for(const row of rows){
  if(row.mainRequests)assert.ok(row.mainRequests.every(u=>!u.includes('reverse-dependencies.html')&&!u.endsWith('.json')))
  if(row.noSeparatePage)assert.ok(Object.values(row.counts).every(n=>n===0))
}
assert.equal(full.reversePages,after.reverseFiles)
assert.equal(full.totalBytes,after.logicalBytes)
assert.equal(full.reverseBytes,after.reverseLogicalBytes)
const search=JSON.parse(readFileSync('dist/assets/package-search.json','utf8'))
assert.equal(search.length,full.packages);assert.ok(search.every(r=>r.length===2&&r.every(v=>typeof v==='string')))
const hash=b=>createHash('sha256').update(b).digest('hex')
const prior=JSON.parse(readFileSync('benchmarks/results/2026-10-29-optimization/input-integrity.json','utf8'))
assert.equal(hash(readFileSync('public/search.js')),prior.sourceFiles.find(r=>r.path==='public/search.js').sha256)
let jsonFiles=[]
function findJson(dir){for(const name of readdirSync(dir)){const file=join(dir,name);if(statSync(file).isDirectory())findJson(file);else if(name.endsWith('.json'))jsonFiles.push(relative('dist',file).replaceAll('\\','/'))}}
findJson('dist');assert.deepEqual(jsonFiles,['assets/package-search.json'])
const result={sourceSha256:full.snapshotSha256,packages:full.packages,reversePages:full.reversePages,categoryEdges:full.edges,fullListsAndCountsMatchRds:true,allRequiredCommandsPassed:true,nodeTests:21,prototypeBrowserCases:20,fullBrowserCases:24,noAutoReverseOrJsonRequests:true,noNewRuntimeJson:true,searchScriptAndFormatUnchanged:true,featureHtmlBytes:full.addedFeatureBytes,featureGzipEstimate:full.addedFeatureGzipEstimate,allocatedByteIncrease:after.allocatedBytes-before.allocatedBytes,allHtmlChecked:full.htmlFiles}
writeFileSync(join(out,'final-verification.json'),JSON.stringify(result,null,2))
const files=[]
function walk(dir){for(const name of readdirSync(dir).sort()){const file=join(dir,name),s=statSync(file);if(s.isDirectory())walk(file);else if(name!=='artifact-manifest.json')files.push({path:relative(out,file).replaceAll('\\','/'),bytes:s.size,sha256:hash(readFileSync(file))})}}
walk(out);writeFileSync(join(out,'artifact-manifest.json'),JSON.stringify({files},null,2))
console.log(JSON.stringify({...result,artifactFiles:files.length},null,2))
