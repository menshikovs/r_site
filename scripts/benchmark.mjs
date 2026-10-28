#!/usr/bin/env node
// Dependency-free transport benchmark. It fetches a route and the same-origin
// CSS/scripts/images referenced by that HTML, then measures the package-name index and matching cost.
import { performance } from 'node:perf_hooks'
import { createPackageSearchIndex, findPackageMatches } from '../public/search.js'

const args = Object.fromEntries(process.argv.slice(2).map((arg, i, all) => arg.startsWith('--') ? [arg.slice(2), all[i + 1]] : null).filter(Boolean))
const baseline = args.baseline || 'https://cran.r-project.org'
const candidate = args.candidate || 'http://127.0.0.1:8080'
const packageName = args.package || 'termr'
const runs = Math.max(1, Number(args.runs || 3))
const paths = ['/', '/web/packages/', `/web/packages/${encodeURIComponent(packageName)}/`, '/bin/windows/', '/manuals.html']

function absolute(base, value) {
  try { return new URL(value, base) } catch { return null }
}

function references(html, base) {
  const found = []
  for (const match of html.matchAll(/<(link|script|img|iframe|frame)\b([^>]*)>/gi)) {
    const [, tag, attrs] = match
    const rel = /\brel=["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase().split(/\s+/) || []
    if (tag.toLowerCase() === 'link' && !rel.some(value => ['stylesheet', 'icon', 'preload', 'apple-touch-icon'].includes(value))) continue
    const value = /\b(?:href|src)=["']([^"']+)["']/i.exec(attrs)?.[1]
    const url = value && absolute(base, value)
    if (url && /^https?:$/.test(url.protocol)) found.push({ url, isDocument: ['iframe', 'frame'].includes(tag.toLowerCase()) })
  }
  return found
}

async function sample(url) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const started = performance.now()
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
      const firstByte = performance.now()
      const body = new Uint8Array(await response.arrayBuffer())
      const ended = performance.now()
      return { url: response.url, status: response.status, bytes: body.byteLength, ttfbMs: firstByte - started, totalMs: ended - started, text: new TextDecoder().decode(body), headers: Object.fromEntries(response.headers) }
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  throw lastError
}

async function pageTrial(origin, path) {
  const root = new URL(path, origin)
  const pages = [await sample(root)]
  const seen = new Set([root.href])
  const resources = new Map()
  for (let i = 0; i < pages.length; i += 1) {
    for (const reference of references(pages[i].text, pages[i].url)) {
      const url = reference.url
      if (url.origin !== new URL(origin).origin || seen.has(url.href)) continue
      seen.add(url.href)
      if (reference.isDocument) {
        try { pages.push(await sample(url)) } catch (error) { resources.set(url.href, { url: url.href, error: error.message }) }
      } else if (!url.pathname.endsWith('.html')) {
        resources.set(url.href, null)
      }
    }
  }
  const results = await Promise.all([...resources.keys()].map(async url => {
    try { const resource = await sample(url); return { url: resource.url, status: resource.status, bytes: resource.bytes, ttfbMs: resource.ttfbMs, totalMs: resource.totalMs, cacheControl: resource.headers['cache-control'] || '' } }
    catch (error) { return { url, error: error.message } }
  }))
  const bodyBytes = pages.reduce((total, page) => total + page.bytes, 0) + results.reduce((total, item) => total + (item.bytes || 0), 0)
  return { path, status: pages[0].status, requestCount: pages.length + results.length, responseBodyBytes: bodyBytes, contentEncoding: pages[0].headers['content-encoding'] || 'identity', ttfbMs: pages[0].ttfbMs, loadMs: pages[0].totalMs, resources: [...pages.slice(1).map(page => ({ url: page.url, status: page.status, bytes: page.bytes })), ...results] }
}

async function medianPage(origin, path) {
  const trials = []
  for (let i = 0; i < runs; i += 1) trials.push(await pageTrial(origin, path))
  const median = key => [...trials].map(trial => trial[key]).sort((a, b) => a - b)[Math.floor(trials.length / 2)]
  return { ...trials.at(-1), runs, medianTtfbMs: median('ttfbMs'), medianLoadMs: median('loadMs') }
}

async function searchTrial(origin, term) {
  const started = performance.now()
  const response = await sample(new URL('/assets/package-search.json', origin))
  const index = createPackageSearchIndex(JSON.parse(response.text))
  const matchingStarted = performance.now()
  const matches = findPackageMatches(index, term)
  const matchingMs = performance.now() - matchingStarted
  return {
    query: term,
    requestCount: 1,
    responseBodyBytes: response.bytes,
    matchingMs,
    totalMs: performance.now() - started,
    resultCount: matches.length,
    resultNames: matches.map(entry => entry.name),
    resultTitles: matches.map(entry => entry.title),
  }
}

const report = { generatedAt: new Date().toISOString(), note: 'Response body bytes are measured after fetch decompression. This transport script does not measure browser paint; use the documented browser and Lighthouse procedure for rendering metrics.', origins: {} }
for (const [label, origin] of [['baseline', baseline], ['candidate', candidate]]) {
  report.origins[label] = { origin, pages: [], search: null }
  for (const path of paths) {
    try { report.origins[label].pages.push(await medianPage(origin, path)) }
    catch (error) { report.origins[label].pages.push({ path, error: error.message }) }
  }
  if (label === 'candidate') {
    report.origins[label].search = []
    for (const query of [args.name || 'termr', args.prefix || 'ggplot2', args.substring || 'plot', args.case || 'GGPLOT2']) {
      try { report.origins[label].search.push(await searchTrial(origin, query)) }
      catch (error) { report.origins[label].search.push({ query, error: error.message }) }
    }
  }
}
console.log(JSON.stringify(report, null, 2))
