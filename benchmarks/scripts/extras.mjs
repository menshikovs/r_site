import { chromium } from '../tooling/node_modules/playwright-core/index.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { output } from './prepare.mjs'
import { sites, routes, profiles, chromePath, contextFor } from './browser.mjs'

const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-extensions', '--disable-background-networking', '--disable-component-update'] })
const nojs = [], scenarios = [], search = []
const save = () => { for (const [name, data] of Object.entries({ nojs, scenarios, search })) writeFileSync(join(output, name + '.json'), JSON.stringify(data, null, 2)) }
try {
  for (const profile of Object.keys(profiles)) {
    for (const [site, origin] of Object.entries(sites)) {
      for (const [name, path] of Object.entries(routes)) {
        const { context, page } = await contextFor(browser, profiles[profile], false), requests = [], failures = []
        page.on('request', r => requests.push(r.url())); page.on('requestfailed', r => failures.push(r.url()))
        const response = await page.goto(origin + path, { waitUntil: 'load' })
        const frames = []
        for (const f of page.frames()) frames.push(await f.evaluate(() => ({ title: document.title, links: document.querySelectorAll('a[href]').length, letters: document.querySelectorAll('nav.alphabet a').length, noscript: [...document.querySelectorAll('noscript')].map(e => e.textContent), textLength: document.body?.innerText.length || 0 })))
        nojs.push({ profile, site, page: name, status: response.status(), frames, requests, failures, indexRequested: requests.some(x => x.includes('package-search.json')) })
        await context.close()
      }
      const { context, page } = await contextFor(browser, profiles[profile], false)
      const path = site === 'original' ? '/web/packages/available_packages_by_name.html' : '/web/packages/by-name/g.html'
      await page.goto(origin + path, { waitUntil: 'load' })
      const link = page.locator('a[href*="ggplot2/"]').filter({ hasText: /^ggplot2$/ }).first()
      const exists = await link.count()
      if (exists) { await link.click(); await page.waitForURL('**/web/packages/ggplot2/**') }
      nojs.push({ profile, site, page: 'catalog-to-ggplot2', linkFound: Boolean(exists), destination: page.url() })
      await context.close()
    }
    for (let run = 0; run < 10; run++) {
      for (const site of run % 2 ? ['redesign', 'original'] : ['original', 'redesign']) {
        const { context, page, cdp } = await contextFor(browser, profiles[profile]), origin = sites[site]
        let download = null; const rebinding = [], blocked = []
        await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*://cran.r-project.org/R.css' }, { urlPattern: '*-win.exe' }] })
        cdp.on('Fetch.requestPaused', async event => {
          const url = new URL(event.request.url)
          if (/\.exe$/.test(url.pathname)) { download = url.href; await cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Aborted' }); return }
          if (url.pathname === '/R.css') { rebinding.push(url.href); await cdp.send('Fetch.continueRequest', { requestId:event.requestId,url:origin+url.pathname }); return }
          blocked.push(url.href); await cdp.send('Fetch.failRequest', { requestId:event.requestId,errorReason:'Aborted' })
        })
        const started = performance.now()
        await page.goto(origin + '/', { waitUntil: 'load' })
        const initialLoadedMs = performance.now() - started
        if (site === 'original') {
          let frame = page.frame({ name: 'banner' })
          await frame.locator('a[href="bin/windows/"]').click()
          await frame.waitForURL('**/bin/windows/')
          await frame.locator('a[href="base/"]').first().click()
          await frame.waitForURL('**/bin/windows/base/')
          await frame.locator('a[href$="-win.exe"]').click({ noWaitAfter: true })
        } else {
          await page.locator('a.download-card[href="/bin/windows/"]').click()
          await page.waitForURL('**/bin/windows/')
          await page.locator('a.primary-link[href$="-win.exe"]').click({ noWaitAfter: true })
        }
        for (let i = 0; !download && i < 100; i++) await page.waitForTimeout(10)
        scenarios.push({ profile, site, run, initialLoadedMs, totalToDownloadRequestMs: performance.now() - started, clicks: site === 'original' ? 3 : 2, download, rebinding, blocked, note: 'Binary request intercepted and aborted; binary bytes and human decision time are not measured.' })
        await context.close(); save()
      }
      const { context, page } = await contextFor(browser, profiles[profile])
      await page.goto(sites.redesign + '/web/packages/', { waitUntil: 'load' })
      await page.locator('input[type="search"]').fill('ggplot2')
      for (const cache of ['first', 'repeat']) {
        await page.evaluate(() => {
          performance.clearResourceTimings(); window.__searchDone = null
          const output = document.querySelector('.search-results'), form = output.closest('form')
          const started = performance.now()
          const observer = new MutationObserver(() => {
            if (output.querySelector('ol') && !form.hasAttribute('aria-busy')) { window.__searchDone = performance.now() - started; observer.disconnect() }
          })
          observer.observe(form, { childList: true, subtree: true, attributes: true })
        })
        await page.locator('input[type="search"]').press('Enter')
        await page.waitForFunction(() => window.__searchDone !== null)
        search.push({ profile, run, cache, ...await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource').filter(e => e.name.includes('package-search.json'))
          return { ms: window.__searchDone, requests: resources.length, encodedBytes: resources.reduce((n,e) => n+e.encodedBodySize,0), decodedBytes: resources.reduce((n,e) => n+e.decodedBodySize,0), resultNames: [...document.querySelectorAll('.search-result-name')].map(e => e.textContent) }
        }) })
      }
      await context.close(); save(); console.log(`${profile} scenarios/search ${run + 1}/10`)
    }
  }
} finally { save(); await browser.close() }
