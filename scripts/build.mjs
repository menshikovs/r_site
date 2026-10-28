import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  MIRRORS_URL,
  PACKAGES_URL,
  CRAN_BASE,
  buildSearchNameShards,
  buildSearchShards,
  cleanOfficialHtml,
  parseDcf,
  parseMirrorsHtml,
  parseMacInstallers,
  parseWindowsInstaller,
  validateOfficialPage,
  validatePackages,
} from '../src/cran-data.mjs'
import {
  renderCatalog,
  renderHome,
  renderMirrors,
  renderPackage,
  renderPackageIndexRedirect,
  renderCatalogLetter,
  renderOfficialPage,
  renderPlatform,
  renderPackageSourceIndex,
  renderSourceLanding,
} from '../src/templates.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(projectRoot, 'dist')
const manualPageNames = ['R-FAQ', 'R-intro', 'R-data', 'R-admin', 'R-exts', 'R-lang', 'R-ints'].flatMap(manual => ['r-release', 'r-patched', 'r-devel'].map(version => `manual_${version}_${manual}`))

export async function fetchCranData() {
  const temporary = join(tmpdir(), `cran-static-${process.pid}`)
  const dcf = join(temporary, 'packages.dcf')
  const mirrorsFile = join(temporary, 'mirrors.html')
  const resourceDir = join(temporary, 'pages')
  mkdirSync(temporary, { recursive: true })
  try {
    const downloader = join(projectRoot, 'scripts', 'fetch-cran-data.R')
    const packageRds = join(temporary, 'packages.rds')
    const nodeDownloader = join(projectRoot, 'scripts', 'fetch-cran-data.mjs')
    execFileSync(process.execPath, [nodeDownloader, PACKAGES_URL, MIRRORS_URL, packageRds, mirrorsFile, resourceDir], {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 900_000,
    })
    execFileSync(process.env.RSCRIPT_PATH || 'Rscript', [downloader, packageRds, dcf], {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 900_000,
    })
    const records = validatePackages(parseDcf(readFileSync(dcf, 'utf8')))
    const mirrors = parseMirrorsHtml(readFileSync(mirrorsFile, 'utf8'))
    const basePageNames = ['windows_base', 'windows_contrib', 'rtools', 'windows_faq', 'macos', 'macos_contrib', 'macos_tools', 'macos_faq', 'linux_debian', 'linux_ubuntu', 'linux_fedora', 'manuals', 'faqs', 'mirror_howto', 'policies', 'cran_team', 'source_base']
    const pages = Object.fromEntries([...basePageNames, ...manualPageNames].map(name => [name, validateOfficialPage(readFileSync(join(resourceDir, `${name}.html`), 'utf8'), name)]))
    return { records, mirrors, pages }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

function writePage(root, route, content) {
  const file = join(root, route)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

function renameDirectoryWithRetry(source, destination) {
  let lastError
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      renameSync(source, destination)
      return
    } catch (error) {
      lastError = error
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt === 7) throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
  throw lastError
}

export function buildSite({ records, mirrors, pages = {}, outDir = outputPath, minimumPackages = 1000 }) {
  validatePackages(records, { minimum: minimumPackages })
  if (!Array.isArray(mirrors) || mirrors.length < 10) throw new Error('CRAN mirror data is incomplete; refusing to publish a partial site.')
  if (pages.windows_base && !parseWindowsInstaller(pages.windows_base)) throw new Error('The current stable Windows installer could not be found in the official CRAN listing.')
  if (pages.macos && !parseMacInstallers(pages.macos).length) throw new Error('Current macOS installers could not be found in the official release listing.')

  const destination = resolve(outDir)
  const staging = `${destination}.staging-${process.pid}`
  const backup = `${destination}.previous-${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  try {
    mkdirSync(join(staging, 'assets'), { recursive: true })
    cpSync(join(projectRoot, 'src', 'site.css'), join(staging, 'assets', 'site.css'))
    cpSync(join(projectRoot, 'public', 'search.js'), join(staging, 'assets', 'search.js'))
    cpSync(join(projectRoot, 'public', 'Rlogo.svg'), join(staging, 'Rlogo.svg'))
    writeFileSync(join(staging, '_headers'), '/*\n  Cache-Control: public, max-age=300, must-revalidate\n/assets/*\n  Cache-Control: public, max-age=3600, must-revalidate\n', 'utf8')

    writePage(staging, 'index.html', renderHome({ packageCount: records.length, mirrorCount: mirrors.length }))
    const windowsInstaller = pages.windows_base ? parseWindowsInstaller(pages.windows_base) : null
    const macInstallers = pages.macos ? parseMacInstallers(pages.macos) : []
    writePage(staging, 'bin/windows/index.html', renderPlatform('windows', { windowsInstaller }))
    writePage(staging, 'bin/macosx/index.html', renderPlatform('macosx', { macInstallers }))
    writePage(staging, 'bin/linux/index.html', renderPlatform('linux'))
    writePage(staging, 'web/packages/index.html', renderCatalog(records))
    writePage(staging, 'web/packages/available_packages_by_name.html', renderPackageIndexRedirect())
    writePage(staging, 'mirrors.html', renderMirrors(mirrors))

    for (const letter of new Set(records.map(record => record.Package[0].toUpperCase()))) {
      writePage(staging, `web/packages/by-name/${letter.toLowerCase()}.html`, renderCatalogLetter(records, letter))
    }
    const manualRoutes = manualPageNames.map(name => {
      const [, version, manual] = /manual_(r-[a-z]+)_(R-[A-Za-z-]+)/.exec(name)
      return `/doc/manuals/${version}/${manual}.html`
    })
    const localRoutes = Object.fromEntries([
      '/manuals.html', '/faqs.html', '/mirrors.html', '/mirror-howto.html', '/web/packages/policies.html', '/CRAN_team.htm',
      '/bin/windows/base/', '/bin/windows/contrib/', '/bin/windows/base/rw-FAQ.html', '/bin/macosx/', '/bin/macosx/contrib/',
      '/bin/windows/Rtools/', '/bin/macosx/tools/', '/bin/macosx/RMacOSX-FAQ.html', '/bin/linux/debian/', '/bin/linux/ubuntu/', '/bin/linux/fedora/', '/src/', '/src/base/', '/src/contrib/',
      ...manualRoutes,
    ].map(path => [`${CRAN_BASE}${path}`, path]))
    const officialResources = [
      ['manuals', '/manuals.html', 'R manuals', 'Official R manuals for the released, patched, and development versions.'],
      ['faqs', '/faqs.html', 'R FAQs', 'Frequently asked questions and installation guidance for R.'],
      ['policies', '/web/packages/policies.html', 'CRAN Repository Policy', 'Current policies for packages distributed through CRAN.'],
      ['cran_team', '/CRAN_team.htm', 'CRAN Team', 'Current CRAN team members, responsibilities, and contact information.'],
      ['mirror_howto', '/mirror-howto.html', 'CRAN Mirror HOWTO', 'Instructions for hosting and maintaining a CRAN mirror.'],
      ['windows_base', '/bin/windows/base/', 'Windows installer directory', 'Current Windows R installer and related files.'],
      ['windows_contrib', '/bin/windows/contrib/', 'Windows package binaries', 'Windows binary package directories for supported R versions.'],
      ['rtools', '/bin/windows/Rtools/', 'Rtools for Windows', 'Official build tools required to compile R packages on Windows.'],
      ['macos_contrib', '/bin/macosx/contrib/', 'macOS package binaries', 'macOS binary package directories for supported architectures.'],
      ['macos_tools', '/bin/macosx/tools/', 'Tools for macOS', 'Additional tools used to build R and packages for macOS.'],
      ['windows_faq', '/bin/windows/base/rw-FAQ.html', 'R for Windows FAQ', 'Official answers to Windows installation and usage questions.'],
      ['macos_faq', '/bin/macosx/RMacOSX-FAQ.html', 'R for macOS FAQ', 'Official answers to macOS installation and usage questions.'],
      ['linux_debian', '/bin/linux/debian/', 'R on Debian', 'CRAN installation instructions for Debian.'],
      ['linux_ubuntu', '/bin/linux/ubuntu/', 'R on Ubuntu', 'CRAN installation instructions for Ubuntu.'],
      ['linux_fedora', '/bin/linux/fedora/', 'R on Fedora', 'CRAN installation instructions for Fedora and related distributions.'],
      ['source_base', '/src/base/', 'Base R source files', 'Official R source releases, development versions, and related files.'],
    ]
    writePage(staging, 'src/index.html', renderSourceLanding({ baseIndex: cleanOfficialHtml(pages.source_base, `${CRAN_BASE}/src/base/`, localRoutes) }))
    writePage(staging, 'src/contrib/index.html', renderPackageSourceIndex())
    const manualTitles = {
      'R-FAQ': 'R FAQ',
      'R-intro': 'An Introduction to R',
      'R-data': 'R Data Import/Export',
      'R-admin': 'R Installation and Administration',
      'R-exts': 'Writing R Extensions',
      'R-lang': 'R Language Definition',
      'R-ints': 'R Internals',
    }
    const manualResources = manualPageNames.map(key => {
      const [, version, manual] = /manual_(r-[a-z]+)_(R-[A-Za-z-]+)/.exec(key)
      const route = `/doc/manuals/${version}/${manual}.html`
      return [key, route, `${manualTitles[manual]} (${version.replace('r-', '')})`, `Official ${manualTitles[manual]} documentation for the ${version.replace('r-', '')} R version.`]
    })
    for (const [key, route, title, description] of [...officialResources, ...manualResources]) {
      if (!pages[key]) continue
      const originalUrl = key === 'macos_faq' ? 'https://cran.r-project.org/bin/macosx/RMacOSX-FAQ.html' : `${CRAN_BASE}${route}`
      const content = cleanOfficialHtml(pages[key], originalUrl, localRoutes)
      const pageHtml = renderOfficialPage({ title, description, canonical: route, content })
      if (route === '/src/base/' || route === '/src/contrib/') writePage(staging, `${route.slice(1)}index.html`, pageHtml)
      else if (route.endsWith('/')) writePage(staging, `${route.slice(1)}index.html`, pageHtml)
      else writePage(staging, route.slice(1), pageHtml)
    }
    const searchShards = buildSearchShards(records)
    for (const [letter, shard] of searchShards) writePage(staging, `assets/search/${letter}.json`, JSON.stringify(shard))
    const searchNameShards = buildSearchNameShards(records)
    for (const [letter, shard] of searchNameShards) writePage(staging, `assets/search-names/${letter}.json`, JSON.stringify(shard))
    for (const record of records) writePage(staging, `web/packages/${record.Package}/index.html`, renderPackage(record))

    rmSync(backup, { recursive: true, force: true })
    if (existsSync(destination)) renameDirectoryWithRetry(destination, backup)
    try {
      renameDirectoryWithRetry(staging, destination)
    } catch (error) {
      if (existsSync(backup) && !existsSync(destination)) renameDirectoryWithRetry(backup, destination)
      throw error
    }
    rmSync(backup, { recursive: true, force: true })
    return { packages: records.length, mirrors: mirrors.length, searchShards: searchShards.size, searchNameShards: searchNameShards.size, output: destination }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
}

async function main() {
  console.log('Downloading official CRAN package data and pages...')
  const data = await fetchCranData()
  console.log(`Generating static HTML and search index for ${data.records.length} packages and ${data.mirrors.length} mirrors...`)
  const result = buildSite(data)
  console.log(`Built ${result.packages} package pages, ${result.searchShards} full-text shards and ${result.searchNameShards} package metadata shards in ${result.output}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`Build failed: ${error.message}`)
    process.exitCode = 1
  })
}
