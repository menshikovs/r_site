import lighthouse from '../tooling/node_modules/lighthouse/core/index.js'
import * as launcher from '../tooling/node_modules/chrome-launcher/dist/index.js'
import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'
import { sites, routes, profiles, chromePath } from './browser.mjs'
const dir=join(output,'lighthouse-current')
if (existsSync(join(output,'lighthouse-current-summary.json'))) throw Error('Choose a fresh BENCHMARK_RESULT_DIR')
mkdirSync(dir,{recursive:true})
const rows=[]
// Lighthouse cache retention alone is insufficient: prime the page in the same
// Chrome process before a warm audit and verify actual cache behavior in the LHR.
for (const [profile,p] of Object.entries(profiles)) for (const [page,path] of Object.entries(routes)) for (const cache of ['cold','warm']) {
  const chrome=await launcher.launch({chromePath,chromeFlags:['--headless=new','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run'],logLevel:'silent'})
  try {
    if(cache==='warm') {
      const browser=await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`)
      const tab=await browser.contexts()[0].newPage()
      await tab.goto(sites.redesign+path); await tab.waitForTimeout(500); await tab.goto('about:blank'); await tab.close()
      // Disconnect without terminating the browser owned by chrome-launcher.
      await browser.close()
    }
    const run=await lighthouse(sites.redesign+path,{port:chrome.port,logLevel:'error',output:'json',onlyCategories:['performance','accessibility'],disableStorageReset:cache==='warm',formFactor:p.mobile?'mobile':'desktop',throttlingMethod:'devtools',maxWaitForFcp:10000,maxWaitForLoad:15000,throttling:{rttMs:p.latency,throughputKbps:p.mbps*1000,requestLatencyMs:p.latency,downloadThroughputKbps:p.mbps*1000,uploadThroughputKbps:p.mbps*1000,cpuSlowdownMultiplier:p.cpu},screenEmulation:{mobile:p.mobile,width:p.viewport.width,height:p.viewport.height,deviceScaleFactor:1,disabled:false}})
    writeFileSync(join(dir,`${profile}-${page}-${cache}.json`),JSON.stringify(run.lhr))
    const lhr=run.lhr
    rows.push({profile,page,cache,score:lhr.categories.performance.score,accessibility:lhr.categories.accessibility.score,runtimeError:lhr.runtimeError,metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time'].map(k=>[k,lhr.audits[k]?.numericValue])),contrast:lhr.audits['color-contrast'],warnings:lhr.runWarnings})
    writeFileSync(join(output,'lighthouse-current-summary.json'),JSON.stringify(rows,null,2))
    console.log(`${profile} ${page} ${cache}: ${lhr.categories.performance.score} accessibility=${lhr.categories.accessibility.score}`)
  } finally { await chrome.kill() }
}
