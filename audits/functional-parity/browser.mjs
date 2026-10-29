import { chromium } from '../../benchmarks/tooling/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
const output='audits/functional-parity/2026-10-29'
const root=resolve('dist')
const names=['ggplot2','data.table','Rcpp','termr','MASS']
const server=createServer((req,res)=>{
  let target
  try{target=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname))}catch{res.writeHead(400).end();return}
  if(!target.startsWith(root+String.fromCharCode(92))&&target!==root){res.writeHead(403).end();return}
  if(existsSync(target)&&statSync(target).isDirectory())target=join(target,'index.html')
  if(!existsSync(target)){res.writeHead(404).end();return}
  const type=target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':target.endsWith('.js')?'application/javascript':target.endsWith('.json')?'application/json':'text/html'
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(readFileSync(target))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const rows=[]
const dir=join(output,'screenshots');mkdirSync(dir,{recursive:true})
try{
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false})
    const page=await context.newPage()
    for(const name of names){
      const path=`/web/packages/${name}/index.html`
      assert.equal((await page.goto(origin+path)).status(),200)
      const data=await page.evaluate(()=>({title:document.querySelector('h1').textContent,packageTitle:document.querySelector('.package-title').textContent,description:document.querySelector('.package-description').textContent,version:document.querySelector('.badges b').textContent,width:innerWidth,documentWidth:document.documentElement.scrollWidth,canonical:document.querySelector('link[rel=canonical]').getAttribute('href'),details:Object.fromEntries([...document.querySelectorAll('.metadata-row')].map(r=>[r.querySelector('dt').textContent,r.querySelector('dd').textContent])),internalLinks:[...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href')),missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>id&&!document.getElementById(id)),scripts:document.scripts.length}))
      assert.equal(data.title,name);assert.equal(data.canonical,path)
      assert.ok(data.documentWidth<=width,`Overflow ${name} ${width}`)
      assert.equal(data.scripts,0);assert.equal(data.missingAnchors.length,0)
      assert.ok(!data.details.Authors.includes('person('));assert.ok(!data.details.Authors.includes('<U+'))
      assert.ok(data.details.DOI.startsWith('10.32614/CRAN.package.'))
      if(name==='ggplot2')assert.equal(data.details.Enhances,'sp')
      if(name==='MASS')assert.equal(data.details.Priority,'recommended')
      if(name==='Rcpp')assert.ok(data.details.Authors.includes('Iñaki'))
      if(name==='data.table')assert.ok(data.details.Authors.includes('Giné-Vázquez'))
      for(const href of data.internalLinks){let file=join(root,href.split('#')[0]);if(statSync(file).isDirectory())file=join(file,'index.html');assert.ok(existsSync(file),href)}
      assert.equal(await page.locator('a[href$="/vignettes/"]').count(),0)
      assert.equal(await page.locator(`a[href="https://cran.r-project.org/web/checks/check_results_${name}.html"]`).count(),1)
      await page.keyboard.press('Tab')
      const focus=await page.evaluate(()=>({outline:getComputedStyle(document.activeElement).outlineStyle,outlineWidth:getComputedStyle(document.activeElement).outlineWidth}))
      assert.notEqual(focus.outline,'none')
      rows.push({name,width,...data,focus})
      await page.screenshot({path:join(dir,`${name}-${width}.png`),fullPage:true})
    }
    await page.goto(origin+'/web/packages/')
    assert.equal(await page.locator('.catalog-letter-link').count(),26)
    for(const [letter,name] of [['g','ggplot2'],['d','data.table'],['r','Rcpp'],['t','termr'],['m','MASS']]){
      await page.goto(origin+`/web/packages/by-name/${letter}.html`)
      await page.locator(`a[href="/web/packages/${name}/index.html"]`).click()
      assert.equal(await page.locator('h1').textContent(),name)
    }
    rows.push({width,nojsCatalogToAllFive:true})
    assert.equal((await fetch(origin+'/package=termr')).status,404)
    rows.push({width,standaloneShortFormStatus:404,limitation:'Requires explicit hosting rewrite; not changed'})
    await context.close()
  }
  const context=await browser.newContext(),page=await context.newPage()
  await page.goto(origin+'/web/packages/')
  for(const query of ['termr','ggplot2','plot']){
    await page.locator('input[type=search]').fill(query);await page.locator('input[type=search]').press('Enter')
    await page.waitForFunction(()=>!document.querySelector('.package-search').hasAttribute('aria-busy'))
    const results=await page.locator('.search-result-name').allTextContents()
    assert.ok(results.length);if(query!=='plot')assert.equal(results[0],query)
    rows.push({query,results})
  }
  await context.close()
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));writeFileSync(join(output,'browser-qa.json'),JSON.stringify(rows,null,2))}
const sizes=names.map(name=>{
  const before=readFileSync(join(output,`${name}-before.html`)),after=readFileSync(`dist/web/packages/${name}/index.html`)
  copyFileSync(`dist/web/packages/${name}/index.html`,join(output,`${name}-after.html`))
  return{name,before:before.length,after:after.length,gzipBefore:gzipSync(before).length,gzipAfter:gzipSync(after).length,linksBefore:(before.toString().match(/<a\b[^>]*href=/g)||[]).length,linksAfter:(after.toString().match(/<a\b[^>]*href=/g)||[]).length}
})
let files=0,html=0,bytes=0
function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name),s=statSync(path);if(s.isDirectory())walk(path);else{files++;html+=Number(/\.html?$/.test(name));bytes+=s.size}}}
walk(root)
writeFileSync(join(output,'sizes-after.json'),JSON.stringify({sizes,dist:{files,html,bytes}},null,2))
console.log(`Passed ${rows.length} package/no-JS/search checks; saved sizes and screenshots`)
