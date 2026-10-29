import assert from 'node:assert/strict'
import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, sites } from './browser.mjs'
import { output } from './prepare.mjs'
if (existsSync(join(output,'functional-qa.json'))) throw Error('Choose a fresh BENCHMARK_RESULT_DIR')
const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const rows = []
try {
  for (const width of [320,390,768,1440]) {
    const context = await browser.newContext({ viewport:{width,height:900} })
    const page = await context.newPage()
    for (const path of ['/', '/bin/windows/', '/bin/macosx/', '/bin/linux/', '/web/packages/', '/web/packages/ggplot2/index.html', '/manuals.html']) {
      const response = await page.goto(sites.redesign + path)
      assert.equal(response.status(),200)
      const data = await page.evaluate(() => ({ width:innerWidth, documentWidth:document.documentElement.scrollWidth, canonical:document.querySelector('link[rel=canonical]')?.href, missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(e=>e.getAttribute('href').slice(1)).filter(id=>id && !document.getElementById(decodeURIComponent(id)) && !document.querySelector(`[name="${CSS.escape(decodeURIComponent(id))}"]`)), labels:[...document.querySelectorAll('.home-section .eyebrow')].map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize})) }))
      assert.ok(data.documentWidth<=width,`Overflow at ${width}: ${path}`)
      assert.equal(new URL(data.canonical).pathname,path,`Canonical changed: ${path}`)
      assert.equal(data.missingAnchors.length,0,`Missing anchors: ${path}`)
      await page.keyboard.press('Tab')
      const focus = await page.evaluate(() => ({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}))
      assert.notEqual(focus.outline,'none')
      rows.push({width,path,status:response.status(),...data,focus})
      await page.screenshot({path:join(output,`qa-${width}-${path==='/'?'home':path.split('/').filter(Boolean).at(-1).replace('.html','')}.png`),fullPage:true})
    }
    await page.goto(sites.redesign + '/web/packages/')
    for (const query of ['termr','ggplot2','plot']) {
      await page.locator('input[type=search]').fill(query)
      await page.locator('input[type=search]').press('Enter')
      await page.waitForFunction(() => !document.querySelector('.package-search').hasAttribute('aria-busy'))
      const names = await page.locator('.search-result-name').allTextContents()
      assert.ok(names.length>0)
      if(query!=='plot') assert.equal(names[0],query)
      else assert.ok(names[0].toLowerCase().startsWith('plot'))
      rows.push({width,query,names})
    }
    await context.close()
    const nojs = await browser.newContext({ viewport:{width,height:900},javaScriptEnabled:false })
    const p = await nojs.newPage()
    await p.goto(sites.redesign + '/web/packages/')
    assert.equal(await p.locator('.catalog-letter-link').count(),26)
    await p.locator('a[href="/web/packages/by-name/g.html"]').click()
    await p.locator('a[href="/web/packages/ggplot2/index.html"]').click()
    assert.ok(p.url().endsWith('/web/packages/ggplot2/index.html'))
    rows.push({width,nojsCatalog:true,url:p.url()})
    await nojs.close()
  }
} finally {
  await browser.close()
  writeFileSync(join(output,'functional-qa.json'),JSON.stringify(rows,null,2))
}
console.log(`Passed ${rows.length} responsive, search and no-JavaScript checks`)
