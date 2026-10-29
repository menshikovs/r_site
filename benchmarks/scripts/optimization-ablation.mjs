// Diagnostic controls deliberately alter appearance. Never copied into site sources.
import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromePath, contextFor, profiles, routes, sites } from './browser.mjs'
import { output } from './prepare.mjs'
const css = readFileSync('src/site.css', 'utf8')
if (existsSync(join(output,'ablation.json'))) throw Error('Choose a fresh BENCHMARK_RESULT_DIR')
const variants = {
  control: '',
  noGrid: '.download-grid,.download-card,.card-mark,.why-grid,.starter-path,.starter-path>li,.environment-options,.environment-options li,.resource-grid,.contribute,.alphabet,.alphabet .catalog-letter-link,.download-feature,.platform-grid{display:block!important}',
  automaticText: ':root{text-rendering:auto!important}',
  singleFont: ':root{--mono:Arial,Helvetica,sans-serif!important}',
}
const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const rows = []
try {
  for (const name of ['home', 'windows', 'catalog']) for (let run=0;run<5;run++) for (const variant of (run%2 ? Object.keys(variants).reverse() : Object.keys(variants))) {
    const { context, page, cdp } = await contextFor(browser, profiles.mobile)
    await page.route('**/assets/site.css', route => route.fulfill({ status:200, contentType:'text/css', body:css + variants[variant] }))
    const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]))
    await page.goto(sites.redesign + routes[name]); await page.waitForTimeout(500)
    const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]))
    rows.push({ name, run, variant, layoutMs:1000*(after.LayoutDuration-before.LayoutDuration), styleMs:1000*(after.RecalcStyleDuration-before.RecalcStyleDuration) })
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(join(output,'ablation.json'),JSON.stringify({ warning:'Appearance-changing diagnostic controls; CSS intercepted in every control; not page-load comparisons or proposed production changes.',rows },null,2))
console.log('Saved 60 diagnostic controls')
