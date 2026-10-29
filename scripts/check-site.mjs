import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { REVERSE_CATEGORIES } from '../src/cran-data.mjs'

const root = resolve(process.env.CRAN_CHECK_ROOT || 'dist')
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
const packageNames = new Set(packagePages.map(path => relative(root,path).split(sep)[2]))
const reverseSummaries = new Map(), reverseLists = new Map()
assert.ok(packagePages.length >= 1000, `The package catalog seems incomplete (${packagePages.length} pages).`)
const generatedRoutes = new Set(htmlFiles.map(file => relative(root, file).split(sep).join('/')))
generatedRoutes.add('assets/site.css')
generatedRoutes.add('assets/search.js')
generatedRoutes.add('Rlogo.svg')

for (const file of htmlFiles) {
  // Compare resolved paths, rather than requiring domain-root URL spellings.
  const pageUrl = new URL(relative(root,file).split(sep).join('/'), 'https://mirror.invalid/')
  const html = readFileSync(file, 'utf8').replace(/\b(href|src|action)="([^"]*)"/g, (attribute,key,value) => {
    if (!value || /^(?:#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(value)) return attribute
    const url = new URL(value,pageUrl)
    return `${key}="${url.pathname}${url.search}${url.hash}"`
  })
  assert.match(html, /<!doctype html>/i, `Missing doctype in ${file}`)
  const scripts = [...html.matchAll(/<script\b[^>]*><\/script>/gi)].map(match => match[0])
  const searchEnabled = ['index.html', 'web/packages/index.html'].includes(relative(root, file).split(sep).join('/'))
  if (searchEnabled) assert.deepEqual(scripts, ['<script type="module" src="/assets/search.js"></script>'], `Only the optional search script is allowed in ${file}`)
  else assert.deepEqual(scripts, [], `JavaScript is not allowed in ${file}`)
  assert.match(html, /<html lang="en">/i, `Missing document language in ${file}`)
  const packageMatch = /^web\/packages\/([^/]+)\/(index|reverse-dependencies)\.html$/.exec(relative(root,file).split(sep).join('/'))
  if (packageMatch) {
    const [,name,kind] = packageMatch
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]),`Broken package anchor ${match[1]} in ${file}`)
    if (kind==='index') {
      const counts=[...html.matchAll(/<dd data-reverse-category="([^"]+)">(\d+)<\/dd>/g)]
      assert.deepEqual(counts.map(m=>m[1]),REVERSE_CATEGORIES.map(c=>c.id),`Missing/duplicate reverse counts in ${file}`)
      reverseSummaries.set(name,Object.fromEntries(counts.map(m=>[m[1],Number(m[2])])))
      for(const {id} of REVERSE_CATEGORIES) {
        const count=Number(counts.find(m=>m[1]===id)[2])
        assert.equal(html.includes(`href="/web/packages/${name}/reverse-dependencies.html#${id}"`),count>0,`Wrong reverse navigation ${name} ${id}`)
      }
    } else {
      const lists={}
      for(const {id} of REVERSE_CATEGORIES){
        const section=new RegExp(`<section id="${id}" class="panel reverse-section">([\\s\\S]*?)</section>`).exec(html)?.[1]
        assert.ok(section,`Missing reverse section ${file}#${id}`)
        const items=[...section.matchAll(/<li>([\s\S]*?)<\/li>/g)]
        assert.equal(items.length,Number(/<span>(\d+) packages<\/span>/.exec(section)?.[1]),`Incorrect reverse list count ${file}#${id}`)
        const seen=new Set()
        for(const [,item] of items){
          const local= /^<a href="\/web\/packages\/([^/]+)\/index\.html">([^<]+)<\/a>$/.exec(item)
          const external=/^<span class="reverse-external">([^<]+)<\/span>$/.exec(item)
          const dependent=local?.[2]||external?.[1]
          assert.ok(dependent,`Malformed reverse item in ${file}`)
          assert.ok(!seen.has(dependent),`Duplicate reverse item in ${file}`);seen.add(dependent)
          assert.equal(Boolean(local),packageNames.has(dependent),`Wrong local/external treatment: ${dependent}`)
          if(local)assert.equal(local[1],dependent,`Mismatched package link in ${file}`)
        }
        lists[id]=items.length
      }
      reverseLists.set(name,lists)
    }
  }
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

for(const [name,counts] of reverseSummaries){
  const nonempty=Object.values(counts).some(n=>n>0)
  assert.equal(reverseLists.has(name),nonempty,`Missing or unnecessary reverse page for ${name}`)
  if(nonempty)assert.deepEqual(reverseLists.get(name),counts,`Main/reverse count mismatch for ${name}`)
}
for(const name of reverseLists.keys())assert.ok(reverseSummaries.has(name),`Reverse page without main page: ${name}`)

const stylesheet = readFileSync(join(root, 'assets', 'site.css'), 'utf8')
assert.match(stylesheet, /:focus-visible/, 'Visible keyboard focus styles are required.')
assert.match(stylesheet, /prefers-reduced-motion/, 'Reduced-motion support is required.')
assert.doesNotMatch(stylesheet, /fonts\.googleapis\.com|@import/i, 'External font or stylesheet requests are not allowed.')
const home = readFileSync(join(root, 'index.html'), 'utf8')
assert.match(home, /<form class="package-search"/, 'Homepage needs the progressive package search form.')
assert.match(home, /<noscript>/, 'Search must explain that the alphabetical catalog is available without JavaScript.')
assert.match(home, /Search package names only\./, 'The search scope must be clear to users.')
const packageSearchPath = join(root, 'assets', 'package-search.json')
assert.ok(existsSync(packageSearchPath), 'Package-name search index is required.')
const packageSearchIndex = JSON.parse(readFileSync(packageSearchPath, 'utf8'))
assert.equal(packageSearchIndex.length, packagePages.length, 'Search index and package pages must have the same entries.')
assert.ok(packageSearchIndex.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'string'), 'Search entries must contain only a package name and display title.')
assert.equal(existsSync(join(root, 'assets', 'search')), false, 'Full-text token shards are no longer generated.')
assert.equal(existsSync(join(root, 'assets', 'search-names')), false, 'Letter metadata shards are no longer generated.')
assert.match(readFileSync(join(root, '_headers'), 'utf8'), /Cache-Control/, 'Static hosting cache rules are required.')

console.log(`Static site check passed: ${htmlFiles.length} HTML pages; ${packagePages.length} package pages; optional search script is restricted to home and catalog.`)
console.log(`Reverse dependency checks passed: ${reverseLists.size} pages; all category counts, anchors, lists and local/external names checked.`)
