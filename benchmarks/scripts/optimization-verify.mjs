import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { output } from './prepare.mjs'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const browser=readFileSync(join(output,'browser.jsonl'),'utf8').trim().split('\n').map(JSON.parse)
const summary=read(join(output,'optimization-summary.json'))
const lh=read(join(output,'lighthouse-current-summary.json'))
const validation=read(join(output,'validation-status.json'))
const qa=read(join(output,'functional-qa.json'))
const postBuild=read(join(output,'post-build/functional-qa.json'))
const inputs=read(join(output,'input-integrity.json'))
assert.equal(browser.length,400)
assert.ok(browser.every(r=>!r.error&&!r.failures.length&&!r.errors.length))
assert.ok(browser.filter(r=>r.cache==='warm').every(r=>r.transferredBytes===0))
assert.equal(summary.load.length,72)
assert.ok(summary.load.every(r=>r.httpErrors===0&&r.timeouts===r.transportErrors))
assert.ok(summary.load.filter(r=>r.filesystem!=='DrvFS').every(r=>r.timeouts===0))
assert.equal(lh.length,20)
assert.ok(lh.every(r=>!r.runtimeError&&r.score===1&&r.accessibility===1&&r.contrast.score===1))
assert.ok(validation.every(r=>r.exitCode===0))
assert.equal(qa.length,44);assert.equal(postBuild.length,44)
assert.ok(inputs.allMatch)
assert.ok(inputs.sourceFiles.every(r=>hash(readFileSync(r.path))===r.sha256))
const archives=read('benchmarks/results/2026-10-28/archives.json')
assert.ok(archives.every(r=>hash(readFileSync(join('benchmarks/results/2026-10-28',r.name)))===r.sha256))
const result={browserObservations:400,k6Intervals:72,lighthouseAudits:20,initialQa:44,postBuildQa:44,allRequiredCommandsPassed:true,frontendSourcesUnchanged:true,previousArchivesUnchanged:true,zeroWarmBrowserTransfers:true,zeroNativeTimeouts:true,nginxLogBytes:Object.fromEntries(['nginx-comparison-error.log','nginx-native-error.log'].map(n=>[n,statSync(join(output,n)).size]))}
writeFileSync(join(output,'final-verification.json'),JSON.stringify(result,null,2))
const files=[]
function walk(dir){for(const entry of readdirSync(dir).sort()){const p=join(dir,entry);if(statSync(p).isDirectory())walk(p);else if(entry!=='artifact-manifest.json')files.push({path:relative(output,p).replaceAll('\\','/'),bytes:statSync(p).size,sha256:hash(readFileSync(p))})}}
walk(output)
writeFileSync(join(output,'artifact-manifest.json'),JSON.stringify({files},null,2))
console.log(JSON.stringify({...result,artifactFiles:files.length},null,2))
