import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {performance} from 'node:perf_hooks'
import {chromium} from '../../benchmarks/tooling/node_modules/playwright-core/index.mjs'
import {createPackageSearchIndex,findPackageMatches} from '../../public/search.js'
const exec=promisify(execFile), out='audits/mirrors/2026-10-29',results=[]
const record=(name,data)=>{results.push({name,...data});writeFileSync(out+'/results.json',JSON.stringify({scope:'Loopback Nginx, native ext4, limited official corpus, full real generated output and explicitly synthetic releases',results},null,2))}
const digest=b=>createHash('sha256').update(b).digest('hex')
const expectedSearch=createPackageSearchIndex(JSON.parse(readFileSync('audits/mirrors/.cache/full/assets/package-search.json','utf8')))
const mirrors=[{port:8101,prefix:'/'},{port:8102,prefix:'/CRAN/'},{port:8103,prefix:'/pub/CRAN/'}]
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
async function context(options={}){const c=await browser.newContext(options);await c.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());return c}
try{
 for(const {port,prefix} of mirrors){
  const base=`http://127.0.0.1:${port}`+prefix, oldBase=`http://127.0.0.1:${port+10}`+prefix
  const c=await context(),page=await c.newPage(),failed=[],requests=[]
  page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});page.on('request',r=>requests.push(r.url()))
  await page.goto(oldBase);await page.locator('input[type=search]').fill('termr');await page.locator('.package-search button').click();await page.waitForTimeout(350)
  record('Baseline',{prefix,failed,searchIndexRequests:requests.filter(u=>u.endsWith('package-search.json')),finalUrl:page.url(),searchText:await page.locator('.search-results').count()?await page.locator('.search-results').innerText():null})
  assert.equal((await fetch(oldBase+'package=ggplot2',{redirect:'manual'})).status,404)
  await c.close()
  for(const route of ['','bin/windows/','bin/macosx/','bin/linux/','web/packages/','web/packages/by-name/g.html','web/packages/ggplot2/index.html','web/packages/ggplot2/reverse-dependencies.html','manuals.html','doc/manuals/r-release/R-intro.html','src/contrib/PACKAGES.rds','web/packages/termr/termr.pdf','src/contrib/termr_1.0.1.tar.gz','src/contrib/Archive/uuid/uuid_1.2-1.tar.gz','bin/windows/contrib/4.6/termr_1.0.1.zip','web/checks/check_results_termr.html','web/views/','web/packages/ggplot2/vignettes/ggplot2.html','assets/site.css','assets/search.js','Rlogo.svg']) {
    const r=await fetch(base+route);assert.equal(r.status,200,base+route);await r.arrayBuffer()
  }
  for(const [short,target] of [['package=ggplot2','web/packages/ggplot2/index.html'],['package=termr&version=1.0.1','src/contrib/termr_1.0.1.tar.gz'],['package=uuid&version=1.2-1','src/contrib/Archive/uuid/uuid_1.2-1.tar.gz']]){
    const r=await fetch(base+short,{redirect:'manual'});assert.equal(r.status,303);assert.equal(new URL(r.headers.get('location'),base).href,base+target)
  }
  for(const path of ['unknown','package=AbsentAuditName','package=termr&version=0.0.0','web/packages/AbsentAuditName/index.html']){
    const r=await fetch(base+path);assert.equal(r.status,404);assert.match(await r.text(),/Local stand static error fixture/)
  }
  record('HTTP routes and optional resolver',{prefix,routes:21,canonicalCases:3,unknown404:4,shortWithoutRules404:true})
  for(const width of [390,1440])for(const js of [false,true]){
    const ctx=await context({viewport:{width,height:900},javaScriptEnabled:js}),p=await ctx.newPage(),bad=[],indexRequests=[]
    p.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()})})
    p.on('request',r=>{if(r.url().endsWith('package-search.json'))indexRequests.push(r.url())})
    await p.goto(base);await p.waitForTimeout(100);assert.equal(indexRequests.length,0)
    const css=await p.locator('link[rel=stylesheet]').evaluate(el=>el.href);assert.equal(css,base+'assets/site.css')
    if(js){
      const queries=[]
      for(const query of ['termr','ggplot2','plot','GGPLOT2']){
        await p.locator('input[type=search]').fill(query);await p.locator('.package-search button').click();await p.locator('.search-results ol').waitFor()
        const names=await p.locator('.search-result-name').allTextContents(),hrefs=await p.locator('.search-result').evaluateAll(es=>es.map(e=>e.href))
        assert.deepEqual(names,findPackageMatches(expectedSearch,query).map(e=>e.name));assert.ok(names.length>0);assert.ok(names.every(n=>n.toLowerCase().includes(query.toLowerCase())));if(query.toLowerCase()!=='plot')assert.equal(names[0],query.toLowerCase())
        assert.ok(hrefs.every(h=>h.startsWith(base+'web/packages/')));queries.push({query,names})
      }
      assert.deepEqual(indexRequests,[base+'assets/package-search.json'])
      await p.locator('.search-result').first().click();assert.equal(p.url(),base+'web/packages/ggplot2/index.html')
      record('Search',{prefix,width,queries,indexRequests})
      await p.goto(base+'web/packages/');assert.equal(indexRequests.length,1)
      const catalogQueries=[]
      for(const query of ['termr','ggplot2','plot','GGPLOT2']){
        await p.locator('input[type=search]').fill(query);await p.locator('.package-search button').click();await p.locator('.search-results ol').waitFor()
        const names=await p.locator('.search-result-name').allTextContents();assert.deepEqual(names,findPackageMatches(expectedSearch,query).map(e=>e.name));catalogQueries.push({query,names})
      }
      assert.deepEqual(indexRequests,[base+'assets/package-search.json',base+'assets/package-search.json'])
      record('Catalog search',{prefix,width,queries:catalogQueries,indexRequests:[...indexRequests]})
    }
    await p.goto(base+'web/packages/');assert.equal(await p.locator('.alphabet a').count(),26)
    await p.locator('a[href$="by-name/g.html"]').click();await p.locator('a').filter({hasText:/^ggplot2$/}).first().click()
    assert.equal(p.url(),base+'web/packages/ggplot2/index.html')
    await p.locator('a[href$="reverse-dependencies.html#imports"]').click();assert.equal(new URL(p.url()).hash,'#imports')
    assert.ok(await p.locator('#imports li').count()>5000)
    await p.locator('a').filter({hasText:/^Back to ggplot2/}).first().click()
    assert.equal(p.url(),base+'web/packages/ggplot2/index.html')
    const resource=await p.locator('a').filter({hasText:/^Reference manual/}).evaluate(el=>el.href)
    assert.equal(resource,base+'web/packages/ggplot2/ggplot2.pdf') // not in limited corpus; URL resolution only
    const canonical=await p.locator('link[rel=canonical]').getAttribute('href');assert.equal(canonical,'https://cran.r-project.org/web/packages/ggplot2/index.html')
    assert.equal(await p.locator('.package-header a[rel=external]').evaluate(el=>el.href),'https://cran.r-project.org/web/packages/ggplot2/index.html')
    assert.deepEqual(bad,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    if(!js&&width===390)await p.screenshot({path:out+`/mirror-${port}-nojs.png`,fullPage:true})
    record('Browser navigation',{prefix,width,javaScript:js,css,canonical,networkErrors:bad,resource,alphabet:26})
    await ctx.close()
  }
 }
}finally{await browser.close()}
const originals=JSON.parse(readFileSync('audits/adoption/2026-10-29/inventory.json','utf8')).original.files
const fixtureOwned=new Set(['index.html','web/packages/index.html','web/packages/available_packages_by_name.html','Rlogo.svg'])
// Protected payloads are a stricter corpus subset; ordinary HTML collisions are
// intentionally outside this unchanged-byte assertion.
const protectedFiles=originals.filter(f=>/\.(?:rds|pdf|zip|tar\.gz)$/.test(f.path)||/\/(?:checks|views)\//.test(f.path)||/\/(?:vignettes|LICENSE|README|NEWS)/i.test(f.path))
async function sync(release){const start=performance.now();try{const r=await exec('wsl.exe',['-d','Ubuntu','--','sh','/mnt/c/Users/User001/r_site/audits/mirrors/sync.sh',release]);writeFileSync(out+'/rsync-'+release+'-'+results.length+'.txt',r.stdout);return{wallMs:performance.now()-start,stdout:r.stdout,exitCode:0}}catch(e){writeFileSync(out+'/interrupted.txt',e.stdout+'\n'+e.stderr);return{wallMs:performance.now()-start,exitCode:e.code,stderr:e.stderr}}}
async function protectedHashes(){for(const f of protectedFiles){const r=await fetch('http://127.0.0.1:8104/'+f.path);assert.equal(r.status,200,f.path);assert.equal(digest(Buffer.from(await r.arrayBuffer())),f.sha256,f.path)}}
record('Initial fixture sync',await sync('a'));await protectedHashes()
let r=await fetch('http://127.0.0.1:8104/web/packages/RetiredAuditPackage/index.html');assert.equal(r.status,200)
const oldReverse=await (await fetch('http://127.0.0.1:8104/web/packages/ggplot2/reverse-dependencies.html')).text()
const interrupt=await sync('interrupted');assert.notEqual(interrupt.exitCode,0)
assert.match(await (await fetch('http://127.0.0.1:8104/web/packages/ggplot2/index.html')).text(),/Controlled metadata update/)
assert.equal(await (await fetch('http://127.0.0.1:8104/web/packages/ggplot2/reverse-dependencies.html')).text(),oldReverse)
record('Interrupted sync mixed release',{...interrupt,mixedHtmlAndReverse:true,note:'Deterministic partial transfer followed by unavailable source, not a network fault injection'})
record('Repair to B',await sync('b'));await protectedHashes()
assert.equal((await fetch('http://127.0.0.1:8104/web/packages/RetiredAuditPackage/index.html')).status,404)
assert.equal((await fetch('http://127.0.0.1:8104/web/packages/AddedAuditPackage/index.html')).status,200)
assert.match(await (await fetch('http://127.0.0.1:8104/web/packages/ggplot2/reverse-dependencies.html')).text(),/AddedAuditPackage/)
const index=await(await fetch('http://127.0.0.1:8104/assets/package-search.json')).json()
assert.ok(index.some(e=>e[0]==='AddedAuditPackage'));assert.ok(!index.some(e=>e[0]==='RetiredAuditPackage'))
record('B add delete metadata reverse search',{added200:true,removed404:true,protectedFiles:protectedFiles.length,protectedHashesMatch:true})
record('Rollback to A',await sync('a'));await protectedHashes()
assert.equal((await fetch('http://127.0.0.1:8104/web/packages/RetiredAuditPackage/index.html')).status,200)
assert.equal((await fetch('http://127.0.0.1:8104/web/packages/AddedAuditPackage/index.html')).status,404)
record('Rollback verified',{protectedFiles:protectedFiles.length,retiredRestored:true,addedRemoved:true})
console.log(JSON.stringify({results:results.length,passed:true}))
