import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'

export const sites = { original: 'http://127.0.0.1:8081', redesign: 'http://127.0.0.1:8082' }
export const routes = { home: '/', windows: '/bin/windows/', catalog: '/web/packages/', ggplot2: '/web/packages/ggplot2/index.html', manuals: '/manuals.html' }
export const profiles = {
  desktop: { viewport: { width: 1440, height: 900 }, mobile: false, cpu: 1, latency: 20, mbps: 50 },
  mobile: { viewport: { width: 390, height: 844 }, mobile: true, cpu: 4, latency: 40, mbps: 10 },
}
export const chromePath = process.env.BENCHMARK_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const runs = Number(process.env.BENCHMARK_RUNS || 10)
const phase = process.argv[2] || 'pages'
const init = () => {
  window.__benchmark = { lcp: null, shifts: [], longtasks: [] }
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__benchmark.lcp = { time: e.startTime, size: e.size } }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__benchmark.shifts.push({ time: e.startTime, value: e.value }) }).observe({ type: 'layout-shift', buffered: true }) } catch {}
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__benchmark.longtasks.push(e.duration) }).observe({ type: 'longtask', buffered: true }) } catch {}
}
export async function contextFor(browser, profile, javascript = true) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.mobile, deviceScaleFactor: 1, hasTouch: profile.mobile, javaScriptEnabled: javascript, serviceWorkers: 'block' })
  await context.addInitScript(init)
  const page = await context.newPage(), cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable'); await cdp.send('Performance.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.mbps * 1e6 / 8, uploadThroughput: profile.mbps * 1e6 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu })
  return { context, page, cdp }
}
const metrics = async cdp => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]))
const visual = () => {
  const nav = performance.getEntriesByType('navigation')[0], data = window.__benchmark || { lcp: null, shifts: [], longtasks: [] }
  let max = 0, sum = 0, first = 0, last = 0
  for (const shift of data.shifts) {
    if (shift.time - last > 1000 || shift.time - first > 5000) { sum = 0; first = shift.time }
    sum += shift.value; max = Math.max(max, sum); last = shift.time
  }
  return { timeOrigin: performance.timeOrigin, ttfbMs: nav ? nav.responseStart - nav.startTime : null, fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, lcpMs: data.lcp?.time ?? null, lcpSize: data.lcp?.size ?? null, dclMs: nav?.domContentLoadedEventEnd ?? null, loadMs: nav?.loadEventEnd ?? null, cls: max, longTaskMs: data.longtasks.reduce((a,b) => a+b, 0), longTaskMaxMs: Math.max(0, ...data.longtasks), textCharacters: document.body?.innerText.length || 0, links: document.querySelectorAll('a[href]').length, title: document.title, width: innerWidth, documentWidth: document.documentElement.scrollWidth }
}

async function trial(browser, site, name, profile, cache, run) {
  const { context, page, cdp } = await contextFor(browser, profiles[profile])
  const requests = new Map(), failures = [], errors = []
  cdp.on('Network.requestWillBeSent', e => {
    const previous = requests.get(e.requestId)
    requests.set(e.requestId, { url: e.request.url, type: e.type, decodedBytes: 0, encodedBytes: 0, redirects: (previous?.redirects || 0) + Number(Boolean(e.redirectResponse)) })
  })
  cdp.on('Network.responseReceived', e => { const r = requests.get(e.requestId); if (r) Object.assign(r, { status: e.response.status, mime: e.response.mimeType, headers: e.response.headers, fromDiskCache: e.response.fromDiskCache, fromServiceWorker: e.response.fromServiceWorker }) })
  cdp.on('Network.dataReceived', e => { const r = requests.get(e.requestId); if (r) r.decodedBytes += e.dataLength })
  cdp.on('Network.loadingFinished', e => { const r = requests.get(e.requestId); if (r) r.encodedBytes = e.encodedDataLength })
  cdp.on('Network.loadingFailed', e => failures.push({ id: e.requestId, error: e.errorText }))
  page.on('pageerror', e => errors.push(e.message))
  const url = sites[site] + routes[name]
  let result
  try {
    if (cache === 'warm') { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(500); await page.goto('about:blank') }
    requests.clear(); failures.length = 0
    const before = await metrics(cdp)
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(500)
    const after = await metrics(cdp), root = await page.evaluate(visual), frames = []
    for (const frame of page.frames().filter(f => f !== page.mainFrame())) {
      try { frames.push({ name: frame.name(), url: frame.url(), ...await frame.evaluate(visual) }) } catch (error) { frames.push({ url: frame.url(), error: error.message }) }
    }
    const network = [...requests.values()].filter(r => /^http/.test(r.url))
    const decoded = type => network.filter(r => r.type === type).reduce((n,r) => n + r.decodedBytes, 0)
    result = { date: new Date().toISOString(), site, page: name, profile, cache, run, url, ...root, frames, requests: network.length, networkRequests: network.filter(r => r.encodedBytes > 0).length, transferredBytes: network.reduce((n,r) => n + r.encodedBytes, 0), htmlBytes: decoded('Document'), cssBytes: decoded('Stylesheet'), jsBytes: decoded('Script'), redirects: network.reduce((n,r) => n + r.redirects, 0), cacheHits: network.filter(r => r.fromDiskCache || r.encodedBytes === 0).length, thirdParty: network.filter(r => new URL(r.url).origin !== new URL(url).origin).map(r => r.url), cpu: Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(k => [k + 'Ms', 1000 * ((after[k] || 0) - (before[k] || 0))])), jsHeapUsedBytes: after.JSHeapUsedSize, network, failures, errors }
  } catch (error) { result = { site, page: name, profile, cache, run, error: error.message, failures } }
  await context.close(); return result
}

async function main() {
  mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-extensions', '--disable-background-networking', '--disable-component-update', '--no-default-browser-check'] })
  writeFileSync(join(output, 'browser-environment.json'), JSON.stringify({ date: new Date().toISOString(), chrome: browser.version(), profiles, runs, sites, routes, headless: true, extensions: false, settleAfterLoadMs: 500 }, null, 2))
  const file = join(output, phase === 'smoke' ? 'browser-smoke.jsonl' : phase === 'repair' ? 'browser-repair.jsonl' : 'browser.jsonl')
  writeFileSync(file, '')
  try {
    for (const profile of Object.keys(profiles)) for (const cache of ['cold', 'warm']) for (const name of Object.keys(routes)) {
      if (phase === 'repair' && !(profile === 'mobile' && cache === 'cold' && ['catalog', 'ggplot2'].includes(name))) continue
      for (let run = 0; run < (phase === 'smoke' ? 1 : runs); run++) {
        for (const site of run % 2 ? ['redesign', 'original'] : ['original', 'redesign']) {
          const result = await trial(browser, site, name, profile, cache, run)
          appendFileSync(file, JSON.stringify(result) + '\n')
          console.log(`${profile} ${cache} ${name} ${run + 1} ${site}: ${result.error || `${result.requests} req ${result.transferredBytes} B FCP=${result.fcpMs} LCP=${result.lcpMs}`}`)
          if (result.error || result.thirdParty?.length || result.failures?.length || result.network?.some(r => r.status >= 400)) throw Error('Incomplete or external-resource trial; inspect saved result before continuing')
        }
      }
    }
    if (phase === 'repair') {
      const initial = readFileSync(join(output, 'browser.jsonl'), 'utf8')
      writeFileSync(join(output, 'browser-initial.jsonl'), initial)
      const rows = initial.trim().split('\n').map(JSON.parse)
      const excluded = rows.filter(x => x.profile === 'mobile' && x.cache === 'cold' && ['catalog', 'ggplot2'].includes(x.page))
      const included = rows.filter(x => !excluded.includes(x))
      writeFileSync(join(output, 'browser-overlap-excluded.jsonl'), excluded.map(JSON.stringify).join('\n') + '\n')
      writeFileSync(join(output, 'browser.jsonl'), included.map(JSON.stringify).join('\n') + '\n' + readFileSync(file, 'utf8'))
      writeFileSync(join(output, 'browser-exclusions.json'), JSON.stringify({ reason: 'Ancillary local HTTP-header probe ran at 2026-10-28T18:06:51Z during the initial series. Conservatively repeat both neighboring mobile/cold catalog and ggplot2 groups; groups selected by time, before examining outcomes.', excluded: excluded.length, replacementFile:'browser-repair.jsonl', initialFile:'browser-initial.jsonl' }, null, 2))
    }
  } finally { await browser.close() }
}
if (process.argv[1]?.endsWith('browser.mjs')) await main()
