import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { output, snapshot, digest, distManifest } from './prepare.mjs'

const read = name => JSON.parse(readFileSync(join(output,name),'utf8').replace(/^\uFEFF/,''))
const before=read('dist-before.json'), after=distManifest(), source=read('source-manifest.json')
const originalFiles=source.records.filter(r=>r.localPath)
const sourceMatches=originalFiles.every(r=>digest(readFileSync(join(snapshot,r.localPath)))===r.sha256)
const rows=readFileSync(join(output,'browser.jsonl'),'utf8').trim().split('\n').map(JSON.parse)
const lh=read('lighthouse-summary.json')
const httpChecks=read('http.json'), searchChecks=read('search.json'), nojsChecks=read('nojs.json')
const settingsMismatches=[]
for(const r of lh) {
  const path=join(output,'lighthouse',`${r.profile}-${r.page}-${r.site}-${r.repeat}.json`)
  try {
    const settings=JSON.parse(readFileSync(path,'utf8')).configSettings
    const desktop=r.profile==='desktop'
    if(settings.throttlingMethod!=='devtools'||settings.formFactor!==r.profile||settings.throttling.cpuSlowdownMultiplier!==(desktop?1:4)||settings.throttling.downloadThroughputKbps!==(desktop?50000:10000)||settings.throttling.requestLatencyMs!==(desktop?20:40)||settings.pauseAfterLoadMs!==5250||settings.cpuQuietThresholdMs!==5250||settings.networkQuietThresholdMs!==5250)settingsMismatches.push(path)
  }catch(error){settingsMismatches.push({path,error:error.message})}
}
const groups=new Map()
for(const r of rows) { const k=[r.profile,r.cache,r.page,r.site].join('/'); groups.set(k,(groups.get(k)||0)+1) }
const validity={checkedAt:new Date().toISOString(),distUnchanged:before.sha256===after.sha256,distSha256Before:before.sha256,distSha256After:after.sha256,distFilesBefore:before.files.length,distFilesAfter:after.files.length,originalFiles:originalFiles.length,originalBytesUnmodified:sourceMatches,browserSamples:rows.length,browserGroups:groups.size,groupCounts:Object.fromEntries(groups),browserErrors:rows.filter(r=>r.error).length,browserFailedRequests:rows.flatMap(r=>r.failures||[]).length,browserHttpErrors:rows.flatMap(r=>r.network||[]).filter(r=>r.status>=400).length,thirdPartyRequests:rows.flatMap(r=>r.thirdParty||[]).length,nojsIndexRequests:read('nojs.json').filter(r=>r.indexRequested).length,scenarios:read('scenarios.json').length,missingDownloadInitiation:read('scenarios.json').filter(r=>!r.download).length,searchSamples:read('search.json').length,lighthouseAudits:read('lighthouse-summary.json').length,loadIntervals:read('load.json').results.length}
validity.lighthouseEffectiveSettingsMismatches=settingsMismatches
validity.nojsScriptRequests=nojsChecks.flatMap(r=>r.requests||[]).filter(url=>url.endsWith('/assets/search.js')).length
validity.invalidSearchSamples=searchChecks.filter(r=>r.resultNames[0]!=='ggplot2'||r.resultNames.length!==4||r.requests!==(r.cache==='first'?1:0)).length
writeFileSync(join(output,'verification.json'),JSON.stringify(validity,null,2))
assert.equal(validity.distUnchanged,true,'dist changed during benchmark')
assert.equal(sourceMatches,true,'Original snapshot bytes were rewritten')
assert.equal(rows.length,400); assert.equal(groups.size,40)
assert.ok([...groups.values()].every(n=>n===10))
assert.equal(validity.browserErrors+validity.browserFailedRequests+validity.browserHttpErrors+validity.thirdPartyRequests,0)
assert.equal(validity.nojsIndexRequests,0); assert.equal(validity.missingDownloadInitiation,0)
assert.equal(validity.nojsScriptRequests,0); assert.equal(validity.invalidSearchSamples,0)
assert.ok(nojsChecks.filter(r=>r.status).every(r=>r.status===200&&!r.failures.length))
assert.equal(source.download.status,200)
for(const check of httpChecks.filter(r=>['home','windows','catalog','ggplot2','manuals'].includes(r.page))) {
  assert.equal(check.first.status,200)
  assert.equal(check.first.headers['content-encoding'],'gzip')
  assert.equal(check.first.headers['cache-control'],'public, max-age=300, must-revalidate')
  assert.ok(check.first.headers.etag)
  assert.equal(check.conditional.status,304); assert.equal(check.conditional.encodedBodyBytes,0)
}
assert.equal(validity.scenarios,40); assert.equal(validity.searchSamples,40)
assert.equal(validity.lighthouseAudits,200); assert.equal(validity.loadIntervals,18)
assert.equal(settingsMismatches.length,0,'Lighthouse effective settings differ from the reported profile')
console.log(JSON.stringify(validity,null,2))
