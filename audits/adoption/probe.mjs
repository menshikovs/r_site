import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {performance} from 'node:perf_hooks'
import {chromium} from '../../benchmarks/tooling/node_modules/playwright-core/index.mjs'
import {validateOverlayPaths} from './policy.mjs'
const exec=promisify(execFile),out='audits/adoption/2026-10-29'
const inventory=JSON.parse(readFileSync(out+'/inventory.json','utf8')),hash=b=>createHash('sha256').update(b).digest('hex')
const native=inventory.original.files,owned=new Set(inventory.owned),results=[]
const save=()=>writeFileSync(out+'/prototype-results.json',JSON.stringify({scope:'Local limited official corpus; full generated overlays; no assertion about private CRAN configuration',results},null,2))
const record=(name,data)=>{results.push({name,...data});save()}
async function response(path,port=8088,options={}){const r=await fetch(`http://127.0.0.1:${port}${path}`,{redirect:'manual',...options});return{status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())}}
async function switchTo(release){const start=performance.now();const r=await exec('wsl.exe',['-d','Ubuntu','--','sh','/mnt/c/Users/User001/r_site/audits/adoption/switch.sh',release]);return{wallMs:performance.now()-start,stdout:r.stdout,stderr:r.stderr}}
async function client(port,stage){const r=await exec('C:/Program Files/R/R-4.5.2/bin/Rscript.exe',['audits/adoption/client.R',`http://127.0.0.1:${port}`]);assert.match(r.stdout,/termr=1\.0\.1/);record(stage,{stdout:r.stdout,stderr:r.stderr})}
const unchanged=await switchTo('verify');writeFileSync(out+'/native-before.sha256',unchanged.stdout)
await client(8089,'R client on native baseline')
const baseline=await response('/src/contrib/',8089)
assert.ok(baseline.body.toString().includes('termr_1.0.1.tar.gz'))
const overlay=await response('/src/contrib/')
assert.equal(overlay.status,200);assert.ok(!overlay.body.toString().includes('termr_1.0.1.tar.gz'))
record('Directory index ownership',{nativeListingShowsTarball:true,overlayListingShowsTarball:false,note:'Known discovery/ownership change; raw file is preserved'})
for(const file of native.filter(f=>!owned.has(f.path))){const r=await response('/'+file.path);assert.equal(r.status,200,file.path);assert.equal(hash(r.body),file.sha256,file.path)}
record('Untouched original resources',{checked:native.filter(f=>!owned.has(f.path)).length,hashesMatch:true})
for(const [path,target] of [['/package=termr','/web/packages/termr/index.html'],['/package=termr&version=1.0.1','/src/contrib/termr_1.0.1.tar.gz'],['/package=uuid&version=1.2-1','/src/contrib/Archive/uuid/uuid_1.2-1.tar.gz']]){
  const r=await response(path);assert.equal(r.status,303);assert.equal(new URL(r.headers.location,'http://127.0.0.1:8088').pathname,target);assert.equal((await response(target)).status,200);record('Canonical resolver',{path,status:303,target,location:r.headers.location})
}
for(const path of ['/package=DefinitelyAbsentAuditPackage','/package=termr&version=0.0.0','/src/contrib/DefinitelyAbsent.tar.gz','/unknown-adoption-path'])assert.equal((await response(path)).status,404)
record('Real 404 policy',{unknownPaths:4,notSpaFallback:true,note:'Invalid version is direct 404 here; public CRAN was observed redirecting first, then 404'})
const range=await response('/bin/windows/contrib/4.6/termr_1.0.1.zip',8088,{headers:{Range:'bytes=0-15'}})
assert.equal(range.status,206);assert.equal(range.body.length,16)
record('Binary download range',{status:range.status,contentRange:range.headers['content-range'],bytes:range.body.length})
assert.equal((await response('/src/contrib/PACKAGES.rds',8092)).status,404)
assert.equal((await response('/web/packages/termr/termr.pdf',8092)).status,404)
record('Dist-only replacement negative control',{repositoryIndex:404,packagePdf:404})
const protectedName='src/contrib/PACKAGES.rds'
assert.ok(!owned.has(protectedName))
validateOverlayPaths([...owned])
assert.throws(()=>validateOverlayPaths([...owned,protectedName]),/Protected original resource/)
record('Protected-path injection',{path:protectedName,rejectedBeforeMerge:true,scope:'Policy predicate negative control; original file was never modified'})
await client(8088,'R client on overlay')
const firstSync=await switchTo('mirror');writeFileSync(out+'/rsync-initial.txt',firstSync.stdout)
assert.equal(hash((await response('/src/contrib/PACKAGES.rds',8089)).body),native.find(f=>f.path==='src/contrib/PACKAGES.rds').sha256)
assert.equal((await response('/_adoption-fixtures/source-link.tar.gz',8089)).status,200)
record('Local mirror initial sync',{wallMs:firstSync.wallMs,relativeSymlinkWorks:true})
const changed=inventory.changedPackagePages[0];assert.ok(changed,'Need a real changed generated metadata page')
const old=await response('/'+changed.path);assert.equal(hash(old.body),changed.beforeSha256)
const switching=switchTo('r2'),switchStatuses=[]
for(let i=0;i<30;i++){switchStatuses.push((await response('/'+changed.path)).status);await new Promise(resolve=>setTimeout(resolve,25))}
const switched=await switching
assert.ok(switchStatuses.every(s=>s===200));assert.equal(hash((await response('/'+changed.path)).body),changed.afterSha256)
record('Release pointer and metadata update',{path:changed.path,beforeSha256:changed.beforeSha256,afterSha256:changed.afterSha256,probeCount:30,statuses:[...new Set(switchStatuses)],switchWallMs:switched.wallMs,scope:'One symlink replacement; not a proof of cross-request/cache/remote-mirror atomicity'})
assert.equal((await response('/_adoption-fixtures/retired.html')).status,404)
const secondSync=await switchTo('mirror');writeFileSync(out+'/rsync-update.txt',secondSync.stdout)
assert.equal((await response('/_adoption-fixtures/retired.html',8089)).status,404)
assert.equal(hash((await response('/'+changed.path,8089)).body),changed.afterSha256)
record('Mirror update and deletion',{wallMs:secondSync.wallMs,retiredFixtureRemoved:true})
await client(8089,'R client on updated mirror')
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},reducedMotion:'reduce'})
  const page=await context.newPage()
  assert.equal((await page.goto('http://127.0.0.1:8088/')).status(),200)
  await page.goto('http://127.0.0.1:8088/web/packages/')
  assert.equal(await page.locator('.catalog-letter-link').count(),26)
  await page.locator('a[href="/web/packages/by-name/g.html"]').click()
  await page.locator('a[href="/web/packages/ggplot2/index.html"]').click()
  await page.locator('.reverse-counts a').first().click()
  assert.ok(page.url().includes('reverse-dependencies.html'))
  assert.ok(await page.locator('.reverse-packages li').count()>8000)
  await page.screenshot({path:out+'/overlay-nojs.png'})
  record('No-JavaScript navigation',{alphabetLinks:26,packageAndFullReverseList:true})
  await page.goto('http://127.0.0.1:8091/CRAN/web/packages/termr/index.html')
  const escaped=await page.locator('link[rel=stylesheet]').getAttribute('href')
  assert.equal(escaped,'/assets/site.css');assert.equal((await response(escaped,8091)).status,404)
  record('Subdirectory mount negative control',{documentStatus:200,stylesheetHref:escaped,stylesheetStatus:404,requiredChange:'Base-path-aware asset/navigation generation or an explicitly supported root mount'})
  await context.close()
}finally{await browser.close()}
await switchTo('r1')
assert.equal(hash((await response('/'+changed.path)).body),changed.beforeSha256)
const rollbackSync=await switchTo('mirror');writeFileSync(out+'/rsync-rollback.txt',rollbackSync.stdout)
assert.equal(hash((await response('/'+changed.path,8089)).body),changed.beforeSha256)
const finalNative=await switchTo('verify');assert.equal(finalNative.stdout,unchanged.stdout)
writeFileSync(out+'/native-after.sha256',finalNative.stdout)
record('Rollback and native integrity',{oldHtmlRestored:true,mirrorRolledBack:true,originalCorpusHashesUnchanged:true,note:'Native repository was frozen for this limited experiment; rollback against a concurrently changing CRAN repository remains unproved'})
console.log(`${results.length} adoption checks completed; expected limitations retained`)
