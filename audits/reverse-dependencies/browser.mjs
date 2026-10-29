import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync,writeFileSync,existsSync,statSync,mkdirSync } from 'node:fs'
import { resolve,join,sep } from 'node:path'
import { chromium } from '../../benchmarks/tooling/node_modules/playwright-core/index.mjs'
import { parseDcf,parseReverseDependencies,REVERSE_CATEGORIES } from '../../src/cran-data.mjs'
const out='audits/reverse-dependencies/2026-10-29',mode=process.argv[2]||'prototype'
const records=parseDcf(readFileSync(join(out,mode==='prototype'?'prototype.dcf':'full/packages.dcf'),'utf8'))
const names=new Set(records.map(r=>r.Package)),reverse=new Map(records.map(r=>[r.Package,parseReverseDependencies(r)]))
const selected=['ggplot2','data.table','Rcpp','termr','MASS']
if(mode==='full'){
  const top=records.map(r=>({name:r.Package,edges:Object.values(reverse.get(r.Package)).reduce((n,a)=>n+a.length,0)})).reduce((a,b)=>a.edges>=b.edges?a:b)
  if(!selected.includes(top.name))selected.push(top.name)
}
const primary=resolve(mode==='prototype'?join(out,'prototype'):'dist'),fallback=resolve('dist')
function fileFor(path){for(const root of [primary,fallback]){let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep))continue;if(existsSync(file)&&statSync(file).isDirectory())file=join(file,'index.html');if(existsSync(file))return file}return null}
const server=createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  const file=path==='/assets/site.css'?resolve('src/site.css'):fileFor(path)
  if(!file){res.writeHead(404,{'Content-Type':'text/html'}).end('<h1>Not found</h1>');return}
  res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/html'});res.end(readFileSync(file))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const rows=[];const images=join(out,`${mode}-screenshots`);mkdirSync(images,{recursive:true})
try{
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false,reducedMotion:'reduce'})
    const page=await context.newPage()
    for(const name of selected){
      const requests=[];const collect=req=>requests.push(req.url());page.on('request',collect)
      const response=await page.goto(`${origin}/web/packages/${name}/index.html`)
      await page.waitForTimeout(50)
      assert.equal(response.status(),200)
      assert.ok(requests.every(u=>!u.includes('reverse-dependencies.html')&&!u.endsWith('.json')))
      const initialRequests=[...requests]
      const main=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,counts:Object.fromEntries([...document.querySelectorAll('[data-reverse-category]')].map(e=>[e.dataset.reverseCategory,Number(e.textContent)])),scripts:document.scripts.length}))
      assert.ok(main.scrollWidth<=width,`${name} main ${width} overflow`);assert.equal(main.scripts,0)
      const expected=Object.fromEntries(REVERSE_CATEGORIES.map(c=>[c.id,reverse.get(name)[c.id].length]))
      assert.deepEqual(main.counts,expected)
      const mainNodeCount=await page.locator('*').count()
      const fullPath=`/web/packages/${name}/reverse-dependencies.html`
      if(Object.values(expected).some(n=>n)){
        await page.locator(`.reverse-counts a`).first().click()
        assert.ok(page.url().includes(fullPath))
        for(const {id} of REVERSE_CATEGORIES){
          const local=await page.locator(`#${id} .reverse-packages a`).allTextContents()
          const external=await page.locator(`#${id} .reverse-external`).allTextContents()
          assert.deepEqual([...local,...external].sort(),[...reverse.get(name)[id]].sort())
          assert.ok(local.every(n=>names.has(n)));assert.ok(external.every(n=>!names.has(n)))
          await page.locator(`.reverse-navigation a[href="#${id}"]`).click()
          assert.equal(new URL(page.url()).hash,`#${id}`)
        }
        const full=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scripts:document.scripts.length,canonical:document.querySelector('link[rel=canonical]').getAttribute('href')}))
        assert.ok(full.scrollWidth<=width,`${name} reverse ${width} overflow`);assert.equal(full.scripts,0);assert.equal(full.canonical,fullPath)
        await page.goto(origin+fullPath)
        await page.keyboard.press('Tab')
        const focus=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle)
        assert.notEqual(focus,'none')
        await page.screenshot({path:join(images,`${name}-${width}-reverse.png`)})
        const back=page.locator(`.package-actions a[href="/web/packages/${name}/index.html"]`)
        await back.click();assert.ok(page.url().endsWith(`/web/packages/${name}/index.html`))
        rows.push({name,width,counts:expected,mainNodeCount,mainRequests:initialRequests,full,focus})
      }else{
        assert.equal(await page.locator('.reverse-counts a').count(),0)
        assert.equal((await fetch(origin+fullPath)).status,404)
        rows.push({name,width,counts:expected,mainNodeCount,noSeparatePage:true})
      }
      page.off('request',collect)
      await page.screenshot({path:join(images,`${name}-${width}-main.png`)})
    }
    await context.close()
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));writeFileSync(join(out,`${mode}-browser.json`),JSON.stringify(rows,null,2))}
console.log(`${mode}: ${rows.length} responsive no-JavaScript package/reverse scenarios passed`)
