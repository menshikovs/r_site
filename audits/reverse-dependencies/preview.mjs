import {chromium} from '../../benchmarks/tooling/node_modules/playwright-core/index.mjs'
import {readFileSync,existsSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try{
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},javaScriptEnabled:false,reducedMotion:'reduce'})
    await page.route('**/*',route=>{
      const path=new URL(route.request().url()).pathname,file=resolve('dist','.'+path)
      if(!existsSync(file))return route.fulfill({status:404,body:''})
      return route.fulfill({contentType:path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html',body:readFileSync(file)})
    })
    await page.goto('http://reverse-preview.invalid/web/packages/ggplot2/index.html')
    await page.locator('.reverse-summary').scrollIntoViewIfNeeded()
    await page.screenshot({path:`audits/reverse-dependencies/2026-10-29/summary-${width}.png`})
    await page.close()
  }
}finally{await browser.close()}
