import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CRAN_BASE, MIRRORS_URL, PACKAGES_URL, parseMirrorsHtml, validateOfficialPage } from '../src/cran-data.mjs'

const knownOfficialMirrors = [
  'https://cloud.r-project.org/',
  'https://cran.csiro.au/',
  'https://ftp.fau.de/cran/',
  'https://mirror.aarnet.edu.au/pub/CRAN/',
]
const pages = {
  windows_base: 'https://cran.r-project.org/bin/windows/base/',
  windows_contrib: 'https://cran.r-project.org/bin/windows/contrib/',
  rtools: 'https://cran.r-project.org/bin/windows/Rtools/',
  windows_faq: 'https://cran.r-project.org/bin/windows/base/rw-FAQ.html',
  macos: 'https://mac.r-project.org/bin/macosx/',
  macos_contrib: 'https://cran.r-project.org/bin/macosx/contrib/',
  macos_tools: 'https://cran.r-project.org/bin/macosx/tools/',
  macos_faq: 'https://cran.r-project.org/bin/macosx/RMacOSX-FAQ.html',
  linux_debian: 'https://cran.r-project.org/bin/linux/debian/',
  linux_ubuntu: 'https://cran.r-project.org/bin/linux/ubuntu/',
  linux_fedora: 'https://cran.r-project.org/bin/linux/fedora/',
  manuals: 'https://cran.r-project.org/manuals.html',
  faqs: 'https://cran.r-project.org/faqs.html',
  mirror_howto: 'https://cran.r-project.org/mirror-howto.html',
  policies: 'https://cran.r-project.org/web/packages/policies.html',
  cran_team: 'https://cran.r-project.org/CRAN_team.htm',
  source_base: 'https://cran.r-project.org/src/base/',
}
const manualNames = ['R-FAQ', 'R-intro', 'R-data', 'R-admin', 'R-exts', 'R-lang', 'R-ints']
const manualUrls = Object.fromEntries(['r-release', 'r-patched', 'r-devel'].flatMap(version => manualNames.map(manual => [
  `manual_${version}_${manual}`,
  `https://cran.r-project.org/doc/manuals/${version}/${manual}.html`,
])))

function normalizeBase(base) {
  return base.endsWith('/') ? base : `${base}/`
}

function candidatesFor(url, mirrorBases, preferredBase) {
  const target = new URL(url)
  if (target.hostname !== new URL(CRAN_BASE).hostname) return [{ url, base: null }]
  const path = `${target.pathname.slice(1)}${target.search}${target.hash}`
  const bases = [...new Set([preferredBase, ...mirrorBases].filter(Boolean).map(normalizeBase))]
  return [
    ...(preferredBase ? [{ url: new URL(path, normalizeBase(preferredBase)).href, base: normalizeBase(preferredBase) }] : []),
    { url, base: null },
    ...bases.filter(base => base !== normalizeBase(preferredBase || '')).map(base => ({ url: new URL(path, base).href, base })),
  ].filter((candidate, index, list) => list.findIndex(other => other.url === candidate.url) === index)
}

export async function fetchFromMirrors(url, {
  mirrorBases = [],
  preferredBase = null,
  fetchImpl = fetch,
  attempts = 2,
  timeoutMs = 30000,
  minimumBytes = 80,
} = {}) {
  const failures = []
  for (const candidate of candidatesFor(url, mirrorBases, preferredBase)) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetchImpl(candidate.url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.byteLength < minimumBytes) throw new Error(`Response was too small (${bytes.byteLength} bytes)`)
        return { bytes, requestedUrl: candidate.url, finalUrl: response.url, mirrorBase: candidate.base }
      } catch (error) {
        failures.push(`${candidate.url} (attempt ${attempt}/${attempts}): ${error.message}`)
        if (attempt < attempts) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 500))
      }
    }
  }
  throw new Error(`Could not fetch official CRAN resource ${url}. ${failures.join('; ')}`)
}

function writeAtomically(path, bytes) {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.download-${process.pid}`
  writeFileSync(temporary, bytes)
  renameSync(temporary, path)
}

function chooseOfficialMirrors(mirrors) {
  const available = new Set(mirrors.map(mirror => normalizeBase(mirror.url)))
  const known = knownOfficialMirrors.filter(base => available.has(base))
  const additional = mirrors
    .map(mirror => normalizeBase(mirror.url))
    .filter(base => base.startsWith('https://') && base !== normalizeBase(CRAN_BASE) && !known.includes(base) && !base.includes('mac.r-project.org'))
  return [...new Set([...known, ...additional])].slice(0, 8)
}

function usage() {
  throw new Error('Usage: node fetch-cran-data.mjs PACKAGES_RDS_URL MIRRORS_URL OUTPUT_RDS OUTPUT_MIRRORS_HTML RESOURCE_DIR')
}

export async function fetchCranInputs({ packagesUrl, mirrorsUrl, outputRds, outputMirrors, resourceDir }) {
  let mirrorBases = knownOfficialMirrors
  let preferredBase = null
  const fetchAndWrite = async (url, destination, label, minimumBytes = 80) => {
    const result = await fetchFromMirrors(url, { mirrorBases, preferredBase, minimumBytes })
    if (result.mirrorBase) preferredBase = result.mirrorBase
    writeAtomically(destination, result.bytes)
    console.log(`Fetched ${label}: ${result.bytes.byteLength.toLocaleString('en-US')} bytes from ${result.finalUrl}`)
  }

  await fetchAndWrite(mirrorsUrl, outputMirrors, 'official CRAN mirror directory', 1000)
  const mirrorData = parseMirrorsHtml(readFileSync(outputMirrors, 'utf8'), { minimum: 10 })
  mirrorBases = chooseOfficialMirrors(mirrorData)
  if (!mirrorBases.length) throw new Error('The official mirror directory contained no HTTPS mirrors for fallback.')

  await fetchAndWrite(packagesUrl, outputRds, 'official package index', 1_000_000)
  mkdirSync(resourceDir, { recursive: true })
  for (const [name, url] of Object.entries(pages)) {
    console.log(`Fetching official CRAN page: ${name}`)
    const path = join(resourceDir, `${name}.html`)
    await fetchAndWrite(url, path, name)
    validateOfficialPage(readFileSync(path, 'utf8'), name)
  }
  for (const [name, url] of Object.entries(manualUrls)) {
    console.log(`Fetching official R manual: ${name}`)
    const path = join(resourceDir, `${name}.html`)
    await fetchAndWrite(url, path, name)
    validateOfficialPage(readFileSync(path, 'utf8'), name)
  }
  return { mirrors: mirrorData.length, mirrorBases }
}

async function main(args) {
  if (args.length !== 5) usage()
  const [packagesUrl = PACKAGES_URL, mirrorsUrl = MIRRORS_URL, outputRds, outputMirrors, resourceDir] = args
  if (!outputRds || !outputMirrors || !resourceDir) usage()
  const result = await fetchCranInputs({ packagesUrl, mirrorsUrl, outputRds: resolve(outputRds), outputMirrors: resolve(outputMirrors), resourceDir: resolve(resourceDir) })
  console.log(`Official HTTPS fallback mirrors available: ${result.mirrorBases.join(', ')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`CRAN download failed: ${error.message}`)
    process.exitCode = 1
  })
}
