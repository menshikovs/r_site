import http from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { output } from './prepare.mjs'
import { sites, routes } from './browser.mjs'
async function get(url, headers = {}) {
  if (!['127.0.0.1'].includes(new URL(url).hostname)) throw Error('Only loopback allowed')
  const started = performance.now()
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { 'Accept-Encoding': 'gzip', ...headers } }, response => {
      const ttfbMs = performance.now() - started; let bytes = 0
      response.on('data', chunk => { bytes += chunk.length })
      response.on('end', () => resolve({ url, status: response.statusCode, headers: response.headers, encodedBodyBytes: bytes, ttfbMs, totalMs: performance.now() - started }))
    }); req.on('error', reject)
  })
}
const result = []
for (const [site, origin] of Object.entries(sites)) for (const [page, path] of Object.entries({ ...routes, slashRedirect: '/bin/windows', missing: '/__benchmark_missing__', ...(site === 'redesign' ? { index: '/assets/package-search.json', css: '/assets/site.css', script: '/assets/search.js' } : { css: '/R.css' }) })) {
  const first = await get(origin + path), conditional = first.status === 200 && first.headers.etag ? await get(origin + path, { 'If-None-Match': first.headers.etag }) : null
  result.push({ site, page, first, conditional })
}
writeFileSync(join(output, 'http.json'), JSON.stringify(result, null, 2))
console.log(result.map(r => `${r.site} ${r.page}: ${r.first.status} ${r.first.encodedBodyBytes}B conditional=${r.conditional?.status || '-'} gzip=${r.first.headers['content-encoding'] || 'identity'}`).join('\n'))
