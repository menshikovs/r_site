import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const root = resolve('dist')
const htmlFiles = []
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.html?$/i.test(path)) htmlFiles.push(path)
  }
}
walk(root)

for (const route of [
  'index.html',
  'mirrors.html',
  'bin/windows/index.html',
  'bin/macosx/index.html',
  'bin/linux/index.html',
  'bin/windows/base/index.html',
  'bin/windows/contrib/index.html',
  'bin/windows/base/rw-FAQ.html',
  'bin/macosx/contrib/index.html',
  'bin/macosx/RMacOSX-FAQ.html',
  'bin/linux/debian/index.html',
  'bin/linux/ubuntu/index.html',
  'bin/linux/fedora/index.html',
  'manuals.html',
  'faqs.html',
  'mirror-howto.html',
  'web/packages/policies.html',
  'CRAN_team.htm',
  'src/index.html',
  'src/base/index.html',
  'src/contrib/index.html',
  'web/packages/index.html',
  'web/packages/by-name/a.html',
  'web/packages/available_packages_by_name.html',
]) {
  assert.ok(htmlFiles.includes(join(root, route)), `Missing generated route: ${route}`)
}
for (const version of ['r-release', 'r-patched', 'r-devel']) {
  for (const manual of ['R-FAQ', 'R-intro', 'R-data', 'R-admin', 'R-exts', 'R-lang', 'R-ints']) {
    const route = `doc/manuals/${version}/${manual}.html`
    assert.ok(htmlFiles.includes(join(root, route)), `Missing generated manual route: ${route}`)
  }
}

const packagePages = htmlFiles.filter(path => /^web[\\/]packages[\\/][^\\/]+[\\/]index\.html$/.test(path.slice(root.length + 1)))
assert.ok(packagePages.length >= 1000, `The package catalog seems incomplete (${packagePages.length} pages).`)
const generatedRoutes = new Set(htmlFiles.map(file => relative(root, file).split(sep).join('/')))
generatedRoutes.add('assets/site.css')
generatedRoutes.add('assets/search.js')
generatedRoutes.add('Rlogo.svg')

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  assert.match(html, /<!doctype html>/i, `Missing doctype in ${file}`)
  const scripts = [...html.matchAll(/<script\b[^>]*><\/script>/gi)].map(match => match[0])
  const searchEnabled = ['index.html', 'web/packages/index.html'].includes(relative(root, file).split(sep).join('/'))
  if (searchEnabled) assert.deepEqual(scripts, ['<script defer src="/assets/search.js"></script>'], `Only the optional search script is allowed in ${file}`)
  else assert.deepEqual(scripts, [], `JavaScript is not allowed in ${file}`)
  assert.match(html, /<html lang="en">/i, `Missing document language in ${file}`)
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    const value = match[1]
    if (!value.startsWith('/') || value.startsWith('//')) continue
    const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0])
    const target = resolve(root, `.${pathname}`)
    assert.ok(target === root || target.startsWith(`${root}${sep}`), `Unsafe local URL ${value} in ${file}`)
    let route = relative(root, target).split(sep).join('/')
    if (!route || pathname.endsWith('/')) route = `${route ? `${route}/` : ''}index.html`
    assert.ok(generatedRoutes.has(route), `Broken local URL ${value} in ${file}`)
  }
}

const stylesheet = readFileSync(join(root, 'assets', 'site.css'), 'utf8')
assert.match(stylesheet, /:focus-visible/, 'Visible keyboard focus styles are required.')
assert.match(stylesheet, /prefers-reduced-motion/, 'Reduced-motion support is required.')
assert.doesNotMatch(stylesheet, /fonts\.googleapis\.com|@import/i, 'External font or stylesheet requests are not allowed.')
const home = readFileSync(join(root, 'index.html'), 'utf8')
assert.match(home, /<form class="package-search"/, 'Homepage needs the progressive package search form.')
assert.match(home, /<noscript>/, 'Alphabet navigation and a no-JavaScript search fallback are required.')
const searchFiles = readdirSync(join(root, 'assets', 'search'))
assert.ok(searchFiles.length > 0, 'Search index shards are required.')
const nameFiles = readdirSync(join(root, 'assets', 'search-names'))
assert.ok(nameFiles.length > 0, 'Exact package-name index shards are required.')
for (const file of nameFiles) {
  const names = JSON.parse(readFileSync(join(root, 'assets', 'search-names', file), 'utf8'))
  assert.ok(Object.keys(names).length > 0, `Empty package-name shard: ${file}`)
}
assert.match(readFileSync(join(root, '_headers'), 'utf8'), /Cache-Control/, 'Static hosting cache rules are required.')

console.log(`Static site check passed: ${htmlFiles.length} HTML pages; ${packagePages.length} package pages; optional search script is restricted to home and catalog.`)
