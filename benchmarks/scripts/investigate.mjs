import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, contextFor, profiles, routes, sites } from './browser.mjs'
import { output } from './prepare.mjs'

mkdirSync(output, { recursive: true })
if (existsSync(join(output,'investigation.json'))) throw Error('Choose a fresh BENCHMARK_RESULT_DIR')
const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-extensions', '--disable-background-networking'] })
const records = []
try {
  for (const [name, path] of Object.entries(routes)) {
    const { context, page, cdp } = await contextFor(browser, profiles.mobile)
    const events = []
    cdp.on('Tracing.dataCollected', e => events.push(...e.value))
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
    await cdp.send('CSS.startRuleUsageTracking')
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' })
    await page.goto(sites.redesign + path); await page.waitForTimeout(500)
    const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve))
    await cdp.send('Tracing.end'); await done
    const coverage = await cdp.send('CSS.stopRuleUsageTracking')
    const dom = await page.evaluate(() => ({ nodes: document.querySelectorAll('*').length, grids: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).display === 'grid').map(e => ({ tag: e.tagName, class: e.className, children: e.children.length })), fonts: [...new Set([...document.querySelectorAll('*')].map(e => getComputedStyle(e).fontFamily))], resources: performance.getEntriesByType('resource').map(e => ({ name: e.name, duration: e.duration })), lcp: window.__benchmark.lcp }))
    const work = events.filter(e => ['Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'EvaluateScript', 'ParseHTML'].includes(e.name)).map(e => ({ name:e.name, ms:(e.dur || 0)/1000, data:e.args }))
    records.push({ name, dom, work, coverage })
    writeFileSync(join(output, `trace-${name}.json`), JSON.stringify({ traceEvents: events }))
    await page.screenshot({ path: join(output, `before-${name}-390.png`), fullPage: true })
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(join(output, 'investigation.json'), JSON.stringify(records, null, 2))
console.log(JSON.stringify(records.map(r => ({ page:r.name, ...r.dom, work:r.work })), null, 2))
