import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import os from 'node:os'

export const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const output = resolve(project, process.env.BENCHMARK_RESULT_DIR || 'benchmarks/results/2026-10-28')
export const snapshot = join(project, 'benchmarks/.cache/original')
export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export function distManifest() {
  const root = join(project, 'dist'), files = []
  function walk(dir) {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else { const bytes = readFileSync(path); files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: digest(bytes) }) }
    }
  }
  walk(root)
  return { files, sha256: digest(JSON.stringify(files)) }
}

function references(text, base, css = false) {
  const refs = []
  if (css) {
    for (const m of text.matchAll(/(?:url\(\s*["']?([^"')]+)|@import\s+["']([^"']+))/gi)) refs.push(m[1] || m[2])
  } else {
    for (const m of text.matchAll(/<(frame|iframe|img|script|link)\b([^>]*)>/gi)) {
      if (m[1].toLowerCase() === 'link' && !/\brel\s*=\s*["']?(?:stylesheet|icon|shortcut)/i.test(m[2])) continue
      const value = /\b(?:src|href)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(m[2])
      if (value) refs.push(value[1] || value[2] || value[3])
    }
  }
  return [...new Set(refs.map(v => { try { return new URL(v.replaceAll('&amp;', '&'), base).href } catch { return null } }).filter(Boolean))]
}

async function main() {
  mkdirSync(output, { recursive: true }); mkdirSync(snapshot, { recursive: true })
  writeFileSync(join(output, 'dist-before.json'), JSON.stringify(distManifest(), null, 2))
  writeFileSync(join(output, 'environment-node.json'), JSON.stringify({ date: new Date().toISOString(), node: process.version, platform: os.platform(), release: os.release(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, ramBytes: os.totalmem(), note: 'Browser and WSL server share the same physical computer.' }, null, 2))
  if (process.argv.includes('--reuse-snapshot')) {
    const recorded=resolve(project,process.env.BENCHMARK_SOURCE_MANIFEST || 'benchmarks/results/2026-10-28/source-manifest.json')
    const bytes=readFileSync(recorded), manifest=JSON.parse(bytes)
    for(const r of manifest.records.filter(r=>r.localPath)) if(digest(readFileSync(join(snapshot,r.localPath)))!==r.sha256)throw Error('Restored source hash mismatch: '+r.localPath)
    writeFileSync(join(output,'source-manifest.json'),bytes)
    console.log('Reusing verified original snapshot; no public requests made.')
    return
  }
  const roots = ['/', '/bin/windows/', '/web/packages/', '/web/packages/available_packages_by_name.html', '/web/packages/ggplot2/index.html', '/manuals.html', '/bin/windows/base/']
  const queue = roots.map(p => new URL(p, 'https://cran.r-project.org').href), seen = new Set(), records = [], external = []
  while (queue.length) {
    const url = queue.shift()
    if (seen.has(url)) continue
    seen.add(url)
    if (seen.size > 64) throw Error('Snapshot request limit exceeded')
    const parsed = new URL(url)
    if (parsed.origin !== 'https://cran.r-project.org') { external.push(url); continue }
    if (/\.(?:exe|pkg|pdf|gz|epub)$/i.test(parsed.pathname)) { external.push(url); continue }
    const record = { url, fetchedAt: new Date().toISOString() }
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
      const bytes = Buffer.from(await response.arrayBuffer())
      Object.assign(record, { status: response.status, headers: Object.fromEntries(response.headers), bytes: bytes.length, sha256: digest(bytes) })
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        record.redirect = new URL(response.headers.get('location'), url).href; queue.push(record.redirect)
      } else if (response.ok) {
        const route = parsed.pathname.endsWith('/') ? parsed.pathname + 'index.html' : parsed.pathname
        const target = resolve(snapshot, '.' + route)
        if (!target.startsWith(snapshot + '/') && !target.startsWith(snapshot + '\\')) throw Error('Unsafe snapshot path')
        mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes)
        record.localPath = relative(snapshot, target).replaceAll('\\', '/')
        if (/html|css/.test(response.headers.get('content-type') || '')) {
          record.references = references(bytes.toString('utf8'), url, /css/.test(response.headers.get('content-type')))
          queue.push(...record.references)
        }
      }
    } catch (error) { record.error = error.message }
    records.push(record); console.log(`${record.status || 'ERROR'} ${record.bytes || 0} ${url}`)
    await new Promise(r => setTimeout(r, 250))
  }
  const base = records.find(r => r.url.endsWith('/bin/windows/base/') && r.localPath)
  let download = null
  if (base) {
    const html = readFileSync(join(snapshot, base.localPath), 'utf8')
    const match = /href=["']([^"']*R-[0-9][^"']*-win\.exe)["']/i.exec(html)
    if (match) {
      const url = new URL(match[1], base.url).href
      try { const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) }); download = { url, status: r.status, headers: Object.fromEntries(r.headers) } }
      catch (error) { download = { url, error: error.message } }
    }
  }
  const manifest = { date: new Date().toISOString(), roots, records, external, download, note: 'Sequential bounded fetch; original response bodies are saved without rewriting. No executable downloaded.' }
  writeFileSync(join(output, 'source-manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ files: records.length, failed: records.filter(r => r.error || r.status >= 400), external, download }, null, 2))
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
