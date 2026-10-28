import { CRAN_BASE, escapeHtml, linkifyText, packagePath } from './cran-data.mjs'

const logo = '<img src="/Rlogo.svg" alt="" width="48" height="38">'

function documentPage({ title, description, canonical, body, styles = true, search = false }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="/Rlogo.svg">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${styles ? '<link rel="stylesheet" href="/assets/site.css">' : ''}
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
${search ? '<script defer src="/assets/search.js"></script>' : ''}
</body>
</html>
`
}

function brand() {
  return `<a class="brand" href="/" aria-label="CRAN home">${logo}<span><strong>CRAN</strong><small>The R Archive Network</small></span></a>`
}

function shell(content, { current = '', footer = true } = {}) {
  const nav = [
    ['download', 'Download R', '/#download'],
    ['packages', 'Packages', '/web/packages/'],
    ['documentation', 'Manuals', '/manuals.html'],
    ['faqs', 'FAQs', '/faqs.html'],
    ['contribute', 'Policies', '/web/packages/policies.html'],
  ]
  return `<a class="skip-link" href="#main">Skip to content</a>
<aside class="sidebar">
  ${brand()}
  <nav aria-label="Main navigation"><p class="nav-label">EXPLORE THE ARCHIVE</p>${nav.map(([id, label, href]) => `<a${current === id ? ' aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}<hr><a href="/mirrors.html">CRAN mirrors</a><a href="/src/">Source downloads</a><a href="/CRAN_team.htm">CRAN team</a><a href="https://www.r-project.org/news.html">R Project news</a></nav>
  <div class="sidebar-note"><p>R packages, documentation,<br>and platform downloads.</p><a href="https://www.r-project.org/">The R Project ${arrow()}</a></div>
</aside>
<main id="main" class="main-content">
${content}
${footer ? `<footer class="site-footer"><div>${brand()}<p>The Comprehensive R Archive Network.<br>Software, documentation, and an open community.</p><a href="#top">Back to top ↑</a></div><nav aria-label="Footer navigation"><a href="/manuals.html">Manuals</a><a href="/faqs.html">FAQs</a><a href="/mirrors.html">Mirrors</a><a href="/src/">Source</a><a href="/web/packages/policies.html">Policies</a><a href="/CRAN_team.htm">Team</a></nav></footer>` : ''}
</main>`
}

function arrow() { return '<span class="arrow" aria-hidden="true">&#8599;</span>' }

function platformIcon(platform) {
  if (platform === 'windows') return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M3 6l11-1v10H3V6zm13-1 13-2v12H16V5zM3 17h11v10L3 26V17zm13 0h13v12l-13-2V17z"/></svg>'
  if (platform === 'macosx') return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M21 7c1-2 1-4 1-4s-3 0-4 2-1 4-1 4 3 0 4-2zm5 13c-1 2-1 3-2 4-1 2-2 4-4 4-2 0-2-1-5-1s-3 1-5 1-3-2-4-4C3 18 3 12 6 10c2-2 5-1 7 0 1 0 2 1 3 0 2-1 5-2 8 0-4 2-4 8 2 10z"/></svg>'
  return '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="5" width="26" height="22" rx="4" stroke="currentColor" stroke-width="2"/><path d="m8 12 4 4-4 4m8 0h7" stroke="currentColor" stroke-width="2"/></svg>'
}

function searchForm(id = 'cran-search') {
  return `<form class="package-search" id="${id}" action="/web/packages/" method="get"><label for="${id}-query">Search CRAN packages</label><div><input id="${id}-query" name="q" type="search" placeholder="Package name or what it does" autocomplete="off"><button type="submit">Search packages ${arrow()}</button></div><p class="search-help">Search package names and descriptions. You can also browse the alphabet without JavaScript.</p><p class="search-results" aria-live="polite" aria-atomic="true"></p><noscript><p>JavaScript is disabled. Browse the complete alphabetical package catalog.</p></noscript></form>`
}

export function renderHome() {
  const platforms = [
    { id: 'windows', name: 'Windows', note: 'Base R for Windows' },
    { id: 'macosx', name: 'macOS', note: 'Apple silicon & Intel' },
    { id: 'linux', name: 'Linux', note: 'Debian, Ubuntu, Fedora & more' },
  ]
  const content = `<header class="topbar"><span>The R Archive Network</span><a href="/mirrors.html">Choose a mirror ${arrow()}</a></header>
<section id="download" class="hero">
  <p class="eyebrow">THE COMPREHENSIVE R ARCHIVE NETWORK</p>
  <h1>Your next discovery<br>starts with <span>R.</span></h1>
  <p class="hero-copy">Download R, explore packages, and find the tools to turn your data into understanding.</p>
  <div class="section-intro"><div><h2>Download and install R</h2><p>Choose your operating system to get started.</p></div><span class="availability">FREE &amp; OPEN SOURCE</span></div>
  <div class="download-grid">${platforms.map(platform => `<a class="download-card" href="/bin/${platform.id}/"><span class="card-mark" aria-hidden="true">${platformIcon(platform.id)}</span><span class="card-category">R FOR ${escapeHtml(platform.name.toUpperCase())}</span>${arrow()}<h3>${escapeHtml(platform.name)}</h3><p>${escapeHtml(platform.note)}</p><span class="card-action">Download R</span></a>`).join('')}</div>
  <div class="source-strip"><div><strong>Prefer to build from source?</strong><span>Source code, development snapshots, and previous releases.</span></div><a href="/src/">Get the source ${arrow()}</a></div>
</section>
<section id="packages" class="content-section"><div class="section-heading"><div><p class="eyebrow">02 / EXTEND WHAT’S POSSIBLE</p><h2>Find your next<br>R package.</h2></div><p>Search by package name or description, or browse the complete catalog alphabetically.</p></div>${searchForm('home-search')}<a class="text-link catalog-link" href="/web/packages/">Browse packages by letter ${arrow()}</a><p class="install-note">Install a package in R with <code>install.packages("packageName")</code>.</p></section>
<section id="documentation" class="content-section"><div class="section-heading"><div><p class="eyebrow">03 / DOCUMENTATION</p><h2>Learn R at<br>your own pace.</h2></div><a class="text-link" href="https://www.r-project.org/">About the R Project ${arrow()}</a></div><div class="resource-grid"><a href="/manuals.html"><span>01 — LEARN</span><h3>The manuals</h3><p>Official guides to the language, installation, administration, and package development.</p><b>Read the documentation ${arrow()}</b></a><a href="/faqs.html"><span>02 — UNDERSTAND</span><h3>Frequently asked questions</h3><p>Answers about R across platforms, with platform-specific installation help.</p><b>Find an answer ${arrow()}</b></a><a href="https://www.r-project.org/help.html"><span>03 — CONNECT</span><h3>Help from the community</h3><p>Find support, ask a good question, and connect with people who work with R.</p><b>Get help with R ${arrow()}</b></a></div></section>
<section id="contribute" class="contribute"><div><p class="eyebrow">04 / CONTRIBUTE</p><h2>Help CRAN<br>grow with R.</h2><p>Learn how package submissions are reviewed and maintained.</p><a class="primary-link" href="/web/packages/policies.html">Read the repository policy ${arrow()}</a></div><div class="contribute-links"><a href="https://xmpalantir.wu.ac.at/cransubmit/"><span>01</span><div><h3>Submit a package</h3><p>Share your work with the R community.</p></div>${arrow()}</a><a href="/mirrors.html"><span>02</span><div><h3>Find a CRAN mirror</h3><p>Access the archive from a server near you.</p></div>${arrow()}</a><a href="/CRAN_team.htm"><span>03</span><div><h3>Meet the CRAN team</h3><p>See team roles and contact details.</p></div>${arrow()}</a></div></section>`
  return documentPage({ title: 'CRAN — The Comprehensive R Archive Network', description: 'Download R, search CRAN packages, and find documentation and resources for the R community.', canonical: '/', body: shell(content), search: true })
}

export function renderPlatform(platform, { windowsInstaller = null, macInstallers = [] } = {}) {
  const platforms = {
    windows: {
      title: 'R for Windows', intro: 'Install the latest stable release of R for 64-bit Windows.',
      resources: [
        ['PACKAGE BINARIES', 'Contributed packages', 'Binary packages built for supported R versions.', '/bin/windows/contrib/', 'Browse package binaries'],
        ['OLDER RELEASES', 'Archived binaries', 'Package binaries for earlier R versions.', 'https://cran-archive.r-project.org/bin/windows/contrib/', 'Open CRAN archive'],
        ['DEVELOPER TOOLS', 'Rtools', 'Tools for building R and R packages on Windows.', '/bin/windows/Rtools/', 'Explore Rtools'],
        ['HELP & INSTALLATION', 'R for Windows FAQ', 'Answers to common questions about installing and using R on Windows.', '/bin/windows/base/rw-FAQ.html', 'Read the FAQ'],
      ],
      note: 'CRAN checks Windows binaries for viruses but cannot give guarantees. Use normal precautions with downloaded executables.',
    },
    macosx: {
      title: 'R for macOS', intro: 'Choose the installer that matches your Mac processor.',
      resources: [
        ['PACKAGE BINARIES', 'macOS package binaries', 'Browse current binary packages and architecture options published by CRAN.', '/bin/macosx/contrib/', 'Browse package binaries'],
        ['DEVELOPER TOOLS', 'Tools for macOS', 'Additional tools and compilers used to build R and packages for Mac.', '/bin/macosx/tools/', 'Explore Mac tools'],
        ['HELP & INSTALLATION', 'R for macOS FAQ', 'Installation help and answers to common Mac-specific questions.', '/bin/macosx/RMacOSX-FAQ.html', 'Read the FAQ'],
      ],
      note: 'The official release page lists current supported macOS versions and architectures. Check it before choosing an installer.',
    },
    linux: {
      title: 'R for Linux', intro: 'Choose installation instructions for your Linux distribution. Package managers and supported releases vary by distribution.',
      resources: [
        ['DEBIAN', 'Debian packages', 'Official repository setup and package-manager instructions for Debian.', '/bin/linux/debian/', 'Read Debian instructions'],
        ['UBUNTU', 'Ubuntu packages', 'Choose your Ubuntu release and follow the matching CRAN repository instructions.', '/bin/linux/ubuntu/', 'Read Ubuntu instructions'],
        ['FEDORA & RED HAT', 'Fedora packages', 'Official package-manager instructions for Fedora and related distributions.', '/bin/linux/fedora/', 'Read Fedora instructions'],
        ['OTHER DISTRIBUTIONS', 'Unix and Linux FAQ', 'General answers for Unix-like systems and other installation options.', '/doc/manuals/r-release/R-FAQ.html', 'Read the R FAQ'],
      ],
      note: 'CRAN’s Linux installation instructions are distribution-specific. Check the matching instructions before adding a repository or installing packages.',
    },
  }
  const page = platforms[platform]
  const path = `/bin/${platform}/`
  const featured = platform === 'windows' && windowsInstaller
    ? `<section class="download-feature"><div><p class="eyebrow">CURRENT STABLE RELEASE / WINDOWS 64-BIT</p><h2>R ${escapeHtml(windowsInstaller.version)}</h2><p>Installer for 64-bit Windows. R 4.1.0 and later support 64-bit Windows only.</p></div><a class="primary-link" href="${escapeHtml(windowsInstaller.url)}">Download R for Windows ${arrow()}</a><p class="download-version-note">${escapeHtml(windowsInstaller.label)}</p></section>`
    : platform === 'macosx'
      ? `<section class="download-feature"><div><p class="eyebrow">CURRENT STABLE RELEASE / MACOS</p><h2>Choose your Mac</h2><p>Use the installer built for your processor architecture.</p></div><div class="architecture-links">${macInstallers.map(item => `<a class="primary-link" href="${escapeHtml(item.url)}">Download R ${escapeHtml(item.version)} for ${item.architecture === 'arm64' ? 'Apple silicon' : 'Intel'} ${arrow()}</a>`).join('') || `<a class="primary-link" href="https://mac.r-project.org/bin/macosx/">Choose an installer on the official release page ${arrow()}</a>`}</div></section>`
      : platform === 'linux'
        ? `<section class="download-feature"><div><p class="eyebrow">INSTALL WITH YOUR DISTRIBUTION</p><h2>Choose your Linux system</h2><p>R is installed through distribution-specific packages. Follow the current instructions for your release.</p></div><div class="architecture-links"><a class="primary-link" href="/bin/linux/debian/">Debian ${arrow()}</a><a class="primary-link" href="/bin/linux/ubuntu/">Ubuntu ${arrow()}</a><a class="primary-link" href="/bin/linux/fedora/">Fedora ${arrow()}</a></div></section>`
        : `<section class="download-feature"><div><p class="eyebrow">CURRENT STABLE RELEASE</p><h2>R for Windows</h2><p>Download the 64-bit installer for a first-time installation.</p></div><a class="primary-link" href="/bin/windows/base/">Open the current Windows installer ${arrow()}</a></section>`
  const resources = page.resources
  const releaseHref = platform === 'windows' ? '/bin/windows/base/' : platform === 'macosx' ? 'https://mac.r-project.org/bin/macosx/' : '/bin/linux/'
  const releaseLabel = platform === 'macosx' ? 'Official macOS release listing' : 'Current installer files'
  const body = shell(`<header class="topbar"><a href="/#download">← Back to downloads</a><a href="${releaseHref}">${releaseLabel} ${arrow()}</a></header><section class="platform-hero"><p class="eyebrow">INSTALL R / ${platform.toUpperCase()}</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.intro)}</p></section>${featured}<section class="platform-resources" aria-label="More ${escapeHtml(page.title)} resources"><p class="eyebrow">MORE RESOURCES</p><div class="platform-grid">${resources.map(([category, title, description, href, action], index) => `<a class="platform-card" href="${escapeHtml(href)}"><span class="platform-card-top"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><span class="card-category">${escapeHtml(category)}</span>${arrow()}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><span class="card-action">${escapeHtml(action)} ${arrow()}</span></a>`).join('')}</div></section><aside class="notice"><strong>BEFORE YOU DOWNLOAD</strong><p>${escapeHtml(page.note)}</p></aside>`, { current: 'download' })
  return documentPage({ title: `${page.title} — CRAN`, description: page.intro, canonical: path, body })
}

export function renderPackage(record) {
  const name = record.Package
  const canonical = packagePath(name)
  const metadataFields = [
    ['Authors', record.Author || record.Authors],
    ['Maintainer', record.Maintainer],
    ['License', record.License],
    ['Published', record['Date/Publication']],
    ['Requires', record.Depends],
    ['Imports', record.Imports],
    ['Suggests', record.Suggests],
    ['Linking to', record.LinkingTo],
    ['System requirements', record.SystemRequirements],
    ['Needs compilation', record.NeedsCompilation],
    ['Project URL', record.URL],
    ['Bug reports', record.BugReports],
  ].filter(([, value]) => typeof value === 'string' && value.trim())
  const metadata = metadataFields.map(([label, value]) => `<div class="metadata-row"><dt>${escapeHtml(label)}</dt><dd>${linkifyText(value)}</dd></div>`).join('')
  const description = record.Description ? linkifyText(record.Description) : '<span class="muted">No description is available in the CRAN package index.</span>'
  const manual = `${CRAN_BASE}/web/packages/${encodeURIComponent(name)}/${encodeURIComponent(name)}.pdf`
  const vignette = `${CRAN_BASE}/web/packages/${encodeURIComponent(name)}/vignettes/`
  const source = record.Version ? `${CRAN_BASE}/src/contrib/${encodeURIComponent(name)}_${encodeURIComponent(record.Version)}.tar.gz` : ''
  const body = `<a class="skip-link" href="#main">Skip to content</a><header class="package-header">${brand()}<span>THE COMPREHENSIVE R ARCHIVE NETWORK</span><a href="${CRAN_BASE}${canonical}">Official CRAN page ${arrow()}</a></header>
<main id="main" class="package-main"><div class="package-actions"><a href="/web/packages/">← Browse packages</a><span>CRAN PACKAGE</span></div>
<section class="package-hero"><p class="eyebrow">PACKAGE RECORD</p><h1>${escapeHtml(name)}</h1>${record.Title ? `<p class="package-title">${escapeHtml(record.Title)}</p>` : ''}<div class="badges">${record.Version ? `<span>VERSION <b>${escapeHtml(record.Version)}</b></span>` : ''}${record.License ? `<span>LICENSE <b>${escapeHtml(record.License)}</b></span>` : ''}</div></section>
<section class="panel"><div class="panel-heading"><div><span class="eyebrow">01 / FROM THE OFFICIAL PACKAGE INDEX</span><h2>Description</h2></div></div><pre class="package-description">${description}</pre></section>
${metadata ? `<section class="panel"><div class="panel-heading"><div><span class="eyebrow">02 / PACKAGE INFORMATION</span><h2>Details</h2></div></div><dl class="metadata-grid">${metadata}</dl></section>` : ''}
<section class="package-resources"><div><span class="eyebrow">CONTINUE EXPLORING</span><h2>Go deeper with ${escapeHtml(name)}.</h2><p>Visit official documentation and source files for this release.</p><p class="install-command"><code>install.packages("${escapeHtml(name)}")</code></p></div><div class="resource-links"><a class="button" href="${manual}">Reference manual ${arrow()}</a><a href="${vignette}">Browse vignettes ${arrow()}</a>${source ? `<a href="${source}">Download source package ${arrow()}</a>` : ''}</div></section>
<footer class="package-footer">${brand()}<span>Package metadata is published by CRAN.</span><a href="/">Back to home ↑</a></footer></main>`
  return documentPage({ title: `${name}${record.Title ? `: ${record.Title}` : ''} — CRAN`, description: record.Description || `${name} package on CRAN.`, canonical, body })
}

export function renderCatalog(records) {
  const groups = groupPackages(records)
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b))
  const alphabet = letters.map(letter => `<a class="catalog-letter-link" href="/web/packages/by-name/${letter.toLowerCase()}.html"><span>${escapeHtml(letter)}</span><small>${groups.get(letter).length.toLocaleString('en-US')} packages</small>${arrow()}</a>`).join('')
  const content = `<header class="topbar"><a href="/">← CRAN home</a><span>${records.length.toLocaleString('en-US')} packages</span></header><section class="catalog-hero"><p class="eyebrow">THE CRAN PACKAGE ARCHIVE</p><h1>Find a package</h1><p>Search package names and descriptions, or browse the complete index by letter.</p>${searchForm('catalog-search')}<p class="catalog-updated">Package metadata is synchronized from CRAN during site build.</p><nav class="alphabet" aria-label="Package names by letter">${alphabet}</nav></section>`
  return documentPage({ title: 'Search CRAN packages', description: `Search or browse ${records.length} packages in the CRAN package archive.`, canonical: '/web/packages/', body: shell(content, { current: 'packages' }), search: true })
}

function groupPackages(records) {
  const groups = new Map()
  for (const record of records) {
    const letter = record.Package[0].toUpperCase()
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter).push(record)
  }
  return groups
}

export function renderCatalogLetter(records, letter) {
  const groups = groupPackages(records)
  const selected = letter.toUpperCase()
  const entries = groups.get(selected)
  if (!entries) throw new Error(`No CRAN packages begin with ${letter}.`)
  const content = `<header class="topbar"><a href="/web/packages/">← All package letters</a><span>${entries.length.toLocaleString('en-US')} packages</span></header><section class="catalog-hero"><p class="eyebrow">CRAN PACKAGES / ${escapeHtml(selected)}</p><h1>Packages starting with ${escapeHtml(selected)}</h1><p>Use browser Find (Ctrl+F / Cmd+F) to locate a package name on this page.</p></section><section class="catalog-letter"><h2>${escapeHtml(selected)}</h2><ul>${entries.map(record => `<li><a href="${packagePath(record.Package)}">${escapeHtml(record.Package)}</a>${record.Title ? `<span>${escapeHtml(record.Title)}</span>` : ''}</li>`).join('')}</ul></section>`
  const canonical = `/web/packages/by-name/${selected.toLowerCase()}.html`
  return documentPage({ title: `CRAN packages starting with ${selected}`, description: `Browse ${entries.length} CRAN package names starting with ${selected}.`, canonical, body: shell(content, { current: 'packages' }) })
}

export function renderMirrors(mirrors) {
  const groups = new Map()
  for (const mirror of mirrors) {
    if (!groups.has(mirror.country)) groups.set(mirror.country, [])
    groups.get(mirror.country).push(mirror)
  }
  const content = `<header class="topbar"><a href="/">← CRAN home</a><a href="/mirror-howto.html">Host a CRAN mirror ${arrow()}</a></header><section class="catalog-hero"><p class="eyebrow">THE COMPREHENSIVE R ARCHIVE NETWORK</p><h1>CRAN mirrors</h1><p>Choose a mirror close to you. CRAN mirrors carry the R distribution, packages, and documentation.</p><p class="catalog-updated">Mirror locations are synchronized from the official CRAN mirror directory during site build.</p><p class="mirror-status"><a href="${CRAN_BASE}/mirmon_report.html">Mirror status</a><a href="${CRAN_BASE}/mirmon_report_release.html">Windows release status</a><a href="${CRAN_BASE}/mirmon_report_old_release.html">Older Windows release status</a></p></section><div class="mirror-groups">${[...groups].map(([country, entries]) => `<section class="mirror-group"><h2>${escapeHtml(country)}</h2><ul>${entries.map(mirror => `<li><a href="${escapeHtml(mirror.url)}">${escapeHtml(mirror.url)}</a>${mirror.description ? `<p>${escapeHtml(mirror.description)}</p>` : ''}</li>`).join('')}</ul></section>`).join('')}</div>`
  return documentPage({ title: 'CRAN mirrors', description: 'Choose a CRAN mirror near you.', canonical: '/mirrors.html', body: shell(content) })
}

export function renderOfficialPage({ title, description, canonical, content, current = 'documentation' }) {
  const bodyContent = content.replace(/<h1\b[^>]*>[\s\S]*?<\/h1\s*>/i, '')
  const body = shell(`<header class="topbar"><a href="/">← CRAN home</a><span>CRAN / ${escapeHtml(title)}</span></header><article class="official-page"><p class="eyebrow">CRAN / ${escapeHtml(title)}</p><h1>${escapeHtml(title)}</h1><div class="official-content">${bodyContent}</div></article>`, { current })
  return documentPage({ title: `${title} — CRAN`, description, canonical, body })
}

export function renderSourceLanding({ baseIndex }) {
  const body = `<header class="topbar"><a href="/">← CRAN home</a><span>CRAN / Source code</span></header><section class="catalog-hero"><p class="eyebrow">SOURCE CODE</p><h1>R source downloads</h1><p>Download released R source code, current patches, development builds, and contributed package sources. The source archives remain on CRAN and keep their existing file paths.</p></section><section class="source-download-grid"><a href="/src/base/"><span class="eyebrow">R RELEASES</span><h2>Base R source</h2><p>Released and historical source code, checksums, and accompanying files.</p><span class="card-action">Browse R source files ${arrow()}</span></a><a href="/src/contrib/"><span class="eyebrow">CONTRIBUTED PACKAGES</span><h2>Package source</h2><p>Find current source releases and repository index files used by R package managers.</p><span class="card-action">Browse package sources ${arrow()}</span></a></section><section class="source-index-panel"><div><p class="eyebrow">R RELEASES AND SNAPSHOTS</p><h2>Current R source files</h2></div><div class="source-index-content">${baseIndex}</div></section>`
  return documentPage({ title: 'R source downloads', description: 'Browse R source releases, development snapshots, and CRAN package source files.', canonical: '/src/', body: shell(body, { current: 'download' }) })
}

export function renderPackageSourceIndex() {
  const body = `<header class="topbar"><a href="/src/">← Source downloads</a><span>CRAN / Package source</span></header><article class="official-page"><p class="eyebrow">CRAN PACKAGE REPOSITORY</p><h1>Package source files</h1><div class="source-overview"><p>CRAN provides current package sources and the repository indexes used by R clients. R users normally install packages with <code>install.packages("packageName")</code>; each package page links to its current source archive.</p><div class="source-download-grid"><a href="/web/packages/"><span class="eyebrow">BROWSE PACKAGES</span><h2>CRAN package catalog</h2><p>Search package names and descriptions, then open a package page for its source archive and documentation.</p><span class="card-action">Find a package ${arrow()}</span></a><a href="${CRAN_BASE}/src/contrib/Archive/"><span class="eyebrow">OLDER VERSIONS</span><h2>Source archive</h2><p>Previous package releases are retained in the official CRAN archive.</p><span class="card-action">Browse archived sources ${arrow()}</span></a></div><section class="source-index-links"><h2>Repository indexes</h2><ul><li><a href="${CRAN_BASE}/src/contrib/PACKAGES">PACKAGES ${arrow()}</a><span>Plain text package index.</span></li><li><a href="${CRAN_BASE}/src/contrib/PACKAGES.gz">PACKAGES.gz ${arrow()}</a><span>Compressed package index.</span></li><li><a href="${CRAN_BASE}/src/contrib/PACKAGES.rds">PACKAGES.rds ${arrow()}</a><span>R serialized package index.</span></li></ul></section></div></article>`
  return documentPage({ title: 'CRAN package source files', description: 'Browse CRAN packages, current source archives, and repository indexes.', canonical: '/src/contrib/', body: shell(body, { current: 'download' }) })
}

export function renderPackageIndexRedirect() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/web/packages/"><link rel="canonical" href="/web/packages/"><title>CRAN package index</title></head><body><main><h1>CRAN package index</h1><p>The package index has moved to <a href="/web/packages/">/web/packages/</a>.</p></main></body></html>
`
}
