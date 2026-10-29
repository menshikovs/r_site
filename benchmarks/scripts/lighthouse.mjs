import lighthouse from '../tooling/node_modules/lighthouse/core/index.js'
import * as launcher from '../tooling/node_modules/chrome-launcher/dist/index.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'
import { sites, routes, profiles, chromePath } from './browser.mjs'

mkdirSync(join(output, 'lighthouse'), { recursive: true })
const summary = []
const smoke = process.argv[2] === 'smoke'
const repeats = smoke ? 1 : Number(process.env.BENCHMARK_LH_RUNS || 10)
{
  for (const [profile, p] of Object.entries(profiles)) for (const [page, path] of Object.entries(routes)) for (let repeat=0;repeat<repeats;repeat++) for (const site of repeat % 2 ? ['redesign','original'] : ['original','redesign']) {
    if (smoke && !(profile === 'desktop' && page === 'home')) continue
    let result
    let chrome
    try {
      chrome = await launcher.launch({ chromePath, chromeFlags: ['--headless=new', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-first-run'], logLevel: 'silent' })
      const run = await lighthouse(sites[site]+path, { port: chrome.port, logLevel: 'error', output:'json', onlyCategories:['performance'], formFactor: p.mobile?'mobile':'desktop', throttlingMethod:'devtools', maxWaitForFcp:10000, maxWaitForLoad:15000, throttling: { rttMs:p.latency, throughputKbps:p.mbps*1000, requestLatencyMs:p.latency, downloadThroughputKbps:p.mbps*1000, uploadThroughputKbps:p.mbps*1000, cpuSlowdownMultiplier:p.cpu }, screenEmulation: { mobile:p.mobile, width:p.viewport.width, height:p.viewport.height, deviceScaleFactor:1, disabled:false } })
      const lhr = run.lhr
      writeFileSync(join(output,'lighthouse',`${smoke?'smoke-':''}${profile}-${page}-${site}-${repeat}.json`),JSON.stringify(lhr))
      result = { profile,page,site,repeat,version:lhr.lighthouseVersion,score:lhr.categories.performance.score,runtimeError:lhr.runtimeError || null,warnings:lhr.runWarnings,audits:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time','speed-index'].map(k=>[k,{value:lhr.audits[k]?.numericValue,error:lhr.audits[k]?.errorMessage}])) }
    } catch(error) { result = {profile,page,site,repeat,error:error.message} }
    finally { if (chrome) await chrome.kill() }
    summary.push(result); writeFileSync(join(output,smoke?'lighthouse-smoke-summary.json':'lighthouse-summary.json'),JSON.stringify(summary,null,2)); console.log(`${profile} ${page} ${site} ${repeat+1}/${repeats}: score=${result.score} error=${result.runtimeError?.code || result.error || '-'}`)
  }
}
