import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildSite } from '../scripts/build.mjs'
import { fetchFromMirrors } from '../scripts/fetch-cran-data.mjs'
import {
  escapeHtml,
  linkifyText,
  packagePath,
  buildSearchNameShards,
  buildSearchShards,
  cleanOfficialHtml,
  parseDcf,
  parseMacInstallers,
  parseMirrorsHtml,
  parseWindowsInstaller,
  searchTokens,
  validatePackages,
  validateOfficialPage,
} from '../src/cran-data.mjs'
import { renderCatalog, renderCatalogLetter, renderOfficialPage, renderPackage, renderPackageSourceIndex } from '../src/templates.mjs'

const fixtureDcf = `Package: termr
Version: 0.1.0
Title: A terminal UI framework
Description: Build interfaces at https://example.org/termr.
    Visit the reference manual for details.
Author: Ada Example
Maintainer: Ada Example <ada@example.org>
License: MIT
Depends: R (>= 4.1.0)

Package: safePkg
Version: 1.2
Description: Text with <script>alert(1)</script> and & characters.
`

test('DCF parser reads records, continuation lines, and slash field names', () => {
  const records = parseDcf(fixtureDcf)
  assert.equal(records.length, 2)
  assert.equal(records[0].Description, 'Build interfaces at https://example.org/termr.\nVisit the reference manual for details.')
  assert.equal(parseDcf('Package: a\nDate/Publication: today\n')[0]['Date/Publication'], 'today')
})

test('HTML metadata is escaped and only web URLs become safe links', () => {
  assert.equal(escapeHtml('<x a="&">\'x\''), '&lt;x a=&quot;&amp;&quot;&gt;&#39;x&#39;')
  const linked = linkifyText('Docs: https://example.org/path, <script>')
  assert.match(linked, /href="https:\/\/example\.org\/path" target="_blank" rel="noopener noreferrer">https:\/\/example\.org\/path<\/a>, &lt;script&gt;/)
  assert.doesNotMatch(linkifyText('javascript:alert(1)'), /<a /)
})

test('CRAN package names are validated before becoming output paths', () => {
  assert.equal(packagePath('termr'), '/web/packages/termr/index.html')
  assert.throws(() => packagePath('../index'), /Invalid CRAN package name/)
  assert.throws(() => validatePackages([{ Package: 'termr', Version: '1' }]), /incomplete/)
  assert.throws(() => validatePackages([{ Package: 'termr', Version: '1' }, { Package: 'termr', Version: '2' }], { minimum: 1 }), /duplicate/)
})

test('search shards find package names, titles, and descriptions lazily by token initial', () => {
  const records = parseDcf(fixtureDcf)
  assert.deepEqual(searchTokens('TERM UI, package!'), ['term', 'ui', 'package'])
  const shards = buildSearchShards(records)
  const names = buildSearchNameShards(records)
  assert.deepEqual(shards.get('t').termr, [['termr', 8]])
  assert.deepEqual(names.get('t').termr.slice(0, 2), ['termr', 'A terminal UI framework'])
  assert.ok(names.get('t').termr[2].length <= 81)
  assert.ok(names.get('t').termr[2].endsWith('…'))
  assert.deepEqual(names.get('s').safepkg, ['safePkg', '', 'Text with <script>alert(1)</script> and & characters.'])
  assert.ok(shards.get('t').terminal.some(([name, score]) => name === 'termr' && score === 4))
  assert.ok(shards.get('i').interfaces.some(([name, score]) => name === 'termr' && score === 1))
})

test('current stable Windows and separate Mac installers are extracted without fixed versions', () => {
  const windows = '<a href="R-devel-win.exe">R-devel-win.exe</a><a href="R-4.6.1-win.exe">R-4.6.1-win.exe</a>'
  assert.deepEqual(parseWindowsInstaller(windows), { version: '4.6.1', label: 'R-4.6.1-win.exe', url: 'https://cran.r-project.org/bin/windows/base/R-4.6.1-win.exe' })
  const mac = '<a href="R-4.6.0-arm64.pkg">R-4.6.0-arm64.pkg</a><a href="R-4.6.1-arm64.pkg">R-4.6.1-arm64.pkg</a><a href="R-4.6.1-x86_64.pkg">R-4.6.1-x86_64.pkg</a><a href="R-devel-arm64.pkg">R-devel-arm64.pkg</a>'
  assert.deepEqual(parseMacInstallers(mac).map(({ version, architecture }) => [version, architecture]), [['4.6.1', 'arm64'], ['4.6.1', 'x86_64']])
})

test('official page converter removes active content and rewrites migrated CRAN links', () => {
  const converted = cleanOfficialHtml('<html><head><script>no</script></head><body><h1>Official</h1><a href="https://cran.r-project.org/mirrors.html">Mirrors</a><img src="/pixel.png" alt="A diagram" onload="bad()"></body></html>', 'https://cran.r-project.org/faqs.html', { 'https://cran.r-project.org/mirrors.html': '/mirrors.html' })
  assert.doesNotMatch(converted, /<script|onload=/i)
  assert.match(converted, /href="\/mirrors\.html"/)
  assert.match(converted, /<img src="https:\/\/cran\.r-project\.org\/pixel\.png" alt="A diagram" loading="lazy" decoding="async">/)
  const namedAnchor = cleanOfficialHtml('<body><a id="section-anchor">¶</a><script>bad()</script></body>', 'https://cran.r-project.org/faqs.html')
  assert.match(namedAnchor, /<span id="section-anchor">¶<\/span>/)
  assert.doesNotMatch(namedAnchor, /<script/)
  const navigation = cleanOfficialHtml('<body><a class="copiable-link" href="#section-anchor">¶</a><p class="nav-panel"><span class="nav-button"><a href="#next" rel="next">Next</a></span><span class="nav-button">&nbsp;</span></p></body>', 'https://cran.r-project.org/manuals.html')
  assert.match(navigation, /aria-label="Section permalink"/)
  assert.match(navigation, /href="#next" rel="next"/)
  assert.doesNotMatch(navigation, /class="nav-button">&nbsp;/)
  const decoratedNavigation = cleanOfficialHtml('<body><p class="nav-panel"><span class="nav-button"><span class="nav-label">Next: </span><span class="nav-link"><a href="#next" rel="next">Next</a></span></span>, <span class="nav-button"><span class="nav-label">Up: </span><span class="nav-link"><a href="#up" rel="up">(dir)</a></span></span> [ <a href="#contents">Contents</a> ]</p></body>', 'https://cran.r-project.org/manuals.html')
  assert.doesNotMatch(decoratedNavigation, /,\s*<span class="nav-button"/)
  assert.doesNotMatch(decoratedNavigation, /\[\s*<a/)
  assert.match(decoratedNavigation, /href="#contents">Contents<\/a>/)
})

test('official document rendering keeps one title and one copy of revision metadata while preserving navigation', () => {
  const policyBody = cleanOfficialHtml('<html><body><h1 class="title">CRAN Repository Policy</h1><h3 class="subtitle">Version 1.2</h3><strong class="author">CRAN Repository Maintainers</strong><br><hr><div class="center">Version 1.2</div><div class="center"><b>CRAN Repository Maintainers</b></div><span class="node-id" id="Top"></span><p class="nav-panel"><span class="nav-button"><span class="nav-label">Next: </span><span class="nav-link"><a href="#Preamble" rel="next">Preamble</a></span></span></p><h2 class="node">Top<a class="copiable-link" href="#Top"> ¶</a></h2><div id="Preamble"><h2 class="unnumbered" id="Preamble-1"><span>Preamble<a class="copiable-link" href="#Preamble-1"> ¶</a></span></h2><p>Policy text remains here.</p></div></body></html>', 'https://cran.r-project.org/web/packages/policies.html')
  const policy = renderOfficialPage({ title: 'CRAN Repository Policy', description: 'Repository policy.', canonical: '/web/packages/policies.html', content: policyBody })
  const article = /<article class="official-page">([\s\S]*?)<\/article>/.exec(policy)?.[1] || ''
  assert.match(article, /<h1 class="title">CRAN Repository Policy<\/h1>/)
  assert.equal((article.match(/Version 1\.2/g) || []).length, 1)
  assert.equal((article.match(/CRAN Repository Maintainers/g) || []).length, 1)
  assert.match(article, /id="Top"/)
  assert.match(article, /href="#Preamble" rel="next"/)
  assert.match(article, /id="Preamble-1"/)
  assert.match(article, /aria-label="Section permalink"/)
  assert.match(article, /class="node">Top/)

  const manual = renderOfficialPage({ title: 'An Introduction to R (release)', description: 'R manual.', canonical: '/doc/manuals/r-release/R-intro.html', content: cleanOfficialHtml('<body><p class="nav-panel"><span class="nav-button"><span class="nav-label">Next: </span><span class="nav-link"><a href="#Preface" rel="next">Preface</a></span></span></p><h1 class="top"><span id="Top">An Introduction to R<a class="copiable-link" href="#Top"> ¶</a></span></h1><p>Manual text.</p></body>', 'https://cran.r-project.org/doc/manuals/r-release/R-intro.html') })
  assert.match(manual, /<h1 class="top"><span id="Top">An Introduction to R/)
  assert.match(manual, /href="#Preface" rel="next"/)
  assert.equal((manual.match(/<h1/g) || []).length, 1)
  assert.match(manual, /<body id="top">/)

  const faq = renderOfficialPage({ title: 'R FAQs', description: 'FAQs.', canonical: '/faqs.html', content: '<h2>FAQ and HOWTO Documents</h2><p>FAQ links remain.</p>' })
  assert.match(faq, /<h1>R FAQs<\/h1>/)
  assert.match(faq, /<h2>FAQ and HOWTO Documents<\/h2>/)
})

test('official page validation accepts ordinary wrapper changes and rejects incomplete upstream pages', () => {
  const updated = '<!doctype html><HTML lang="en"><HEAD><title>Updated page</title></HEAD><BODY class="main"><h1>Current information</h1><p>Official page body with enough readable text.</p></BODY></HTML>'
  assert.equal(validateOfficialPage(updated, 'faqs'), updated)
  assert.throws(() => validateOfficialPage('<html><head><title>Moved</title></head><main>Content moved outside body</main></html>', 'faqs'), /no complete body/)
  assert.throws(() => validateOfficialPage('<html><body><h1>404 Not Found</h1><p>This page was not found on server</p></body></html>', 'faqs'), /error document/)
})

test('official CRAN downloads retry a source and fall back to a configured mirror', async () => {
  const requests = []
  const fetchImpl = async url => {
    requests.push(url)
    if (url.startsWith('https://cran.r-project.org/')) return new Response('temporary upstream failure', { status: 503 })
    return new Response('official mirror content that is long enough to validate with all required metadata bytes', { status: 200 })
  }
  const result = await fetchFromMirrors('https://cran.r-project.org/web/packages/example.html', {
    mirrorBases: ['https://mirror.example/cran/'],
    fetchImpl,
    attempts: 1,
  })
  assert.equal(requests.length, 2)
  assert.equal(requests[1], 'https://mirror.example/cran/web/packages/example.html')
  assert.equal(result.mirrorBase, 'https://mirror.example/cran/')
  assert.match(new TextDecoder().decode(result.bytes), /official mirror content/)
})

test('mirror parser retains groups, official HTTP(S) targets, and descriptions', () => {
  const html = '<dl><dt>0-Cloud</dt><dd><table><tr><td><a href="https://cloud.r-project.org/">cloud</a></td><td>Redirect service</td></tr></table></dd><dt>Canada</dt><dd><table><tr><td><a href="http://mirror.example/cran/">mirror</a></td><td>University</td></tr></table></dd></dl>'
  const mirrors = parseMirrorsHtml(html, { minimum: 2 })
  assert.deepEqual(mirrors.map(({ country, url, description }) => [country, url, description]), [
    ['0-Cloud', 'https://cloud.r-project.org/', 'Redirect service'],
    ['Canada', 'http://mirror.example/cran/', 'University'],
  ])
  assert.throws(() => parseMirrorsHtml('<dl><dt>empty</dt><dd>none</dd></dl>'), /could not be parsed completely/)
})

test('static build emits canonical routes and only opts search pages into JavaScript', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'r-site-test-'))
  try {
    const records = parseDcf(fixtureDcf)
    const mirrors = Array.from({ length: 10 }, (_, index) => ({ country: `Country ${index}`, url: `https://mirror${index}.example/cran/`, description: 'Official mirror' }))
    const pages = {
      windows_base: '<html><body><a href="R-4.6.1-win.exe">Download R-4.6.1 for Windows</a></body></html>',
      macos: '<html><body><a href="sonoma-arm64/base/R-4.6.1-arm64.pkg">R-4.6.1-arm64.pkg</a><a href="big-sur-x86_64/base/R-4.6.1-x86_64.pkg">R-4.6.1-x86_64.pkg</a></body></html>',
      manuals: '<html><body><h1>Official Manuals</h1><a href="https://cran.r-project.org/doc/manuals/r-release/R-intro.html">Introduction</a></body></html>',
      'manual_r-release_R-admin': '<html><body><h1>R Installation and Administration</h1><p>Installation guidance.</p></body></html>',
      'manual_r-release_R-intro': '<html><body><h1>Manual body</h1><p>Preserved source text.</p></body></html>',
      source_base: '<html><body><h1>Index of /src/base</h1><a href="R-latest.tar.gz">R-latest.tar.gz</a></body></html>',
    }
    const result = buildSite({ records, mirrors, pages, outDir, minimumPackages: 2 })
    assert.equal(result.packages, 2)
    const routes = [
      'index.html',
      'bin/windows/index.html',
      'bin/macosx/index.html',
      'bin/linux/index.html',
      'web/packages/index.html',
      'web/packages/by-name/t.html',
      'web/packages/available_packages_by_name.html',
      'web/packages/termr/index.html',
      'mirrors.html',
      'manuals.html',
      'doc/manuals/r-release/R-admin.html',
      'doc/manuals/r-release/R-intro.html',
      'src/index.html',
      'src/base/index.html',
      'src/contrib/index.html',
    ]
    for (const route of routes) {
      const html = readFileSync(join(outDir, route), 'utf8')
      assert.match(html, /<!doctype html>/i, route)
      if (['index.html', 'web/packages/index.html'].includes(route)) assert.match(html, /<script defer src="\/assets\/search\.js"><\/script>/, route)
      else assert.doesNotMatch(html, /<script\b/i, route)
      assert.match(html, /<html lang="en">/i, route)
    }
    const packageHtml = readFileSync(join(outDir, 'web/packages/termr/index.html'), 'utf8')
    assert.match(packageHtml, /install\.packages\("termr"\)/)
    assert.match(packageHtml, /href="https:\/\/example\.org\/termr"/)
    assert.match(packageHtml, /rel="canonical" href="\/web\/packages\/termr\/index\.html"/)
    const index = readFileSync(join(outDir, 'web/packages/index.html'), 'utf8')
    assert.match(index, /href="\/web\/packages\/by-name\/t\.html"/)
    const home = readFileSync(join(outDir, 'index.html'), 'utf8')
    assert.match(home, /href="\/bin\/windows\/"/)
    assert.match(home, /<svg viewBox="0 0 32 32"/)
    assert.doesNotMatch(home, /&amp;gt;_/)
    assert.match(home, /type="search"/)
    assert.match(home, /id="why-r"/)
    assert.match(home, /id="getting-started"/)
    assert.match(home, /2 packages/)
    assert.match(home, /10 mirrors/)
    assert.match(home, /href="\/doc\/manuals\/r-release\/R-intro\.html"/)
    assert.match(home, /<noscript>/)
    assert.match(home, /An IDE is optional; R includes a console\./)
    assert.match(home, /href="\/doc\/manuals\/r-release\/R-intro\.html#Using-R-interactively-1"/)
    assert.match(home, /href="https:\/\/posit\.co\/downloads\/"/)
    assert.match(home, /href="https:\/\/positron\.posit\.co\/download\.html"/)
    assert.match(readFileSync(join(outDir, 'assets/search/t.json'), 'utf8'), /termr/)
    assert.match(readFileSync(join(outDir, 'assets/search-names/t.json'), 'utf8'), /termr.*terminal UI framework.*Build interfaces/)
    assert.equal(existsSync(join(outDir, 'assets/search-meta')), false)
    assert.match(readFileSync(join(outDir, '_headers'), 'utf8'), /Cache-Control/)
    assert.match(readFileSync(join(outDir, 'bin/windows/index.html'), 'utf8'), /R-4\.6\.1-win\.exe/)
    assert.match(readFileSync(join(outDir, 'bin/macosx/index.html'), 'utf8'), /R-4\.6\.1-x86_64\.pkg/)
    assert.match(readFileSync(join(outDir, 'manuals.html'), 'utf8'), /href="\/doc\/manuals\/r-release\/R-intro\.html"/)
    assert.match(readFileSync(join(outDir, 'src/contrib/index.html'), 'utf8'), /PACKAGES\.rds/)
    const letterPage = readFileSync(join(outDir, 'web/packages/by-name/t.html'), 'utf8')
    assert.match(letterPage, /href="\/web\/packages\/termr\/index\.html"/)
    assert.match(readFileSync(join(outDir, 'web/packages/available_packages_by_name.html'), 'utf8'), /url=\/web\/packages\//i)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})

test('package and catalog templates do not emit untrusted HTML', () => {
  const record = { Package: 'safePkg', Version: '1.2', Description: 'Text with <script>alert(1)</script> and & characters.' }
  assert.doesNotMatch(renderPackage(record), /<script>alert/)
  assert.doesNotMatch(renderCatalog([record]), /<script>alert/)
  assert.doesNotMatch(renderCatalogLetter([record], 's'), /<script>alert/)
  assert.match(renderPackage(record), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(renderPackageSourceIndex(), /href="https:\/\/cran\.r-project\.org\/src\/contrib\/PACKAGES\.gz"/)
})

test('incomplete source data cannot replace an existing build', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'r-site-existing-'))
  try {
    const previous = join(outDir, 'index.html')
    writeFileSync(previous, 'previous complete build')
    assert.throws(() => buildSite({ records: [], mirrors: [], outDir }), /incomplete/)
    assert.equal(readFileSync(previous, 'utf8'), 'previous complete build')
    assert.throws(() => buildSite({ records: parseDcf(fixtureDcf), mirrors: Array.from({ length: 10 }, (_, index) => ({ country: `Country ${index}`, url: `https://mirror${index}.example/cran/`, description: 'Official mirror' })), pages: { windows_base: '<html><body>listing temporarily unavailable</body></html>' }, outDir, minimumPackages: 2 }), /Windows installer/)
    assert.equal(readFileSync(previous, 'utf8'), 'previous complete build')
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})
