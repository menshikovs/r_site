import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync,readdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
const out='audits/mirrors/2026-10-29',sha=b=>createHash('sha256').update(b).digest('hex')
const prior=JSON.parse(readFileSync('audits/adoption/2026-10-29/inventory.json','utf8'))
for(const f of prior.production.files)assert.equal(sha(readFileSync('dist/'+f.path)),f.sha256,'Production changed: '+f.path)
for(const path of ['src/site.css','src/cran-data.mjs','scripts/export-cran-data.R','deploy/nginx-wsl.conf'])assert.equal(sha(readFileSync(path)),prior.source[path],path)
const results=JSON.parse(readFileSync(out+'/results.json','utf8')).results
assert.equal(results.length,36);assert.equal(results.filter(r=>r.name==='Browser navigation').length,12)
const searches=results.filter(r=>r.name==='Search'||r.name==='Catalog search');assert.equal(searches.length,12);assert.equal(searches.reduce((n,r)=>n+r.queries.length,0),48)
assert.ok(results.some(r=>r.name==='Interrupted sync mixed release'&&r.mixedHtmlAndReverse))
assert.ok(results.some(r=>r.name==='Rollback verified'&&r.retiredRestored&&r.addedRemoved))
const links=JSON.parse(readFileSync(out+'/link-audit.json','utf8'));assert.equal(links.rootRelative.length,0);assert.ok(links.allGeneratedHashesMatch)
const metrics=JSON.parse(readFileSync(out+'/sync-metrics.json','utf8'));assert.equal(metrics.changed.length,5);assert.equal(metrics.added.length,2);assert.equal(metrics.removed.length,2)
assert.match(readFileSync(out+'/full-check.txt','utf8'),/Static site check passed: 33606 HTML pages/)
assert.doesNotMatch(readFileSync(out+'/listeners-after-stop.txt','utf8'),/:(?:810[1-4]|811[1-3])\s/)
for(const p of ['CRAN_MIRROR_COMPATIBILITY.md','audits/mirrors/README.md']){
 const text=readFileSync(p,'utf8');for(const [,target] of text.matchAll(/\]\(([^)]+)\)/g)){if(/^(?:https?:|#)/.test(target))continue;assert.ok(existsSync(resolve(dirname(p),target.split('#')[0])),`${p}: missing ${target}`)}
}
const summary={recordedChecks:results.length,browserContexts:12,searchQueries:48,offlineTests:24,fullHtml:links.counts.html,rootRelativeAttributes:0,originalCorpus:links.originalsUnchanged,nonownedOriginalsPreserved:links.nonownedOriginalsPreserved,knownBrokenManualFragments:links.brokenFragments.length,productionFilesUnchanged:prior.production.files.length,productionStylesDataExportAnd8080ConfigUnchanged:true,fullMirrorCompatibilityApproved:false,generatedBytes:metrics.fullGeneratedBytes}
summary.auditNginxStopped=true
summary.sourceHashes=Object.fromEntries(['src/static-urls.mjs','src/templates.mjs','public/search.js','scripts/build.mjs','scripts/check-site.mjs','tests/mirror-urls.test.mjs','CRAN_MIRROR_COMPATIBILITY.md'].map(p=>[p,sha(readFileSync(p))]))
writeFileSync(out+'/final-verification.json',JSON.stringify(summary,null,2))
const artifacts=readdirSync(out).filter(n=>statSync(out+'/'+n).isFile()&&n!=='artifacts.json').sort().map(path=>{const b=readFileSync(out+'/'+path);return{path,bytes:b.length,sha256:sha(b)}})
writeFileSync(out+'/artifacts.json',JSON.stringify(artifacts,null,2));console.log(JSON.stringify(summary))
