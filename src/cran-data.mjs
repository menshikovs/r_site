export const CRAN_BASE = 'https://cran.r-project.org'
export const PACKAGES_URL = `${CRAN_BASE}/web/packages/packages.rds`
export const MIRRORS_URL = `${CRAN_BASE}/mirrors.html`
export const PACKAGE_NAME = /^[A-Za-z][A-Za-z0-9.]*$/

export function parseDcf(source) {
  const records = []
  let record = Object.create(null)
  let field = ''

  const finishRecord = () => {
    if (Object.keys(record).length) records.push(record)
    record = Object.create(null)
    field = ''
  }

  for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) {
      finishRecord()
      continue
    }
    if (/^[ \t]/.test(line)) {
      if (field) record[field] += `\n${line.trim()}`
      continue
    }
    const match = /^([^\s:][^:]*):[ \t]*(.*)$/.exec(line)
    if (!match) { field = ''; continue }
    field = match[1]
    record[field] = match[2]
  }
  finishRecord()
  return records
}

export function validatePackages(records, { minimum = 1000 } = {}) {
  if (!Array.isArray(records) || records.length < minimum) {
    throw new Error(`CRAN package index is incomplete (${records?.length ?? 0} records; expected at least ${minimum}).`)
  }

  const seen = new Set()
  for (const record of records) {
    if (!PACKAGE_NAME.test(record.Package || '') || !record.Version?.trim()) {
      throw new Error('CRAN package index contains a record without a valid package name or version.')
    }
    if (seen.has(record.Package)) throw new Error(`CRAN package index contains duplicate package ${record.Package}.`)
    seen.add(record.Package)
  }
  return records
}

function decodeHtml(text) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

export function parseMirrorsHtml(html, { minimum = 10 } = {}) {
  const mirrors = []
  const groups = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi
  for (const match of html.matchAll(groups)) {
    const country = decodeHtml(match[1].replace(/<[^>]*>/g, '').trim())
    const body = match[2]
    const links = /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    for (const link of body.matchAll(links)) {
      const url = decodeHtml(link[1].trim())
      if (!/^https?:\/\//i.test(url)) continue
      const description = decodeHtml(body.slice(link.index + link[0].length).match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() || '')
      mirrors.push({ country, url, description })
    }
  }
  if (mirrors.length < minimum) throw new Error(`CRAN mirror list could not be parsed completely (${mirrors.length} mirrors).`)
  return mirrors
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function linkifyText(value = '') {
  const text = String(value)
  const urlPattern = /https?:\/\/[^\s<>"']+/gi
  let output = ''
  let cursor = 0
  for (const match of text.matchAll(urlPattern)) {
    const start = match.index
    let url = match[0]
    let trailing = ''
    while (/[),.;!?\]}]$/.test(url)) {
      trailing = url.at(-1) + trailing
      url = url.slice(0, -1)
    }
    output += escapeHtml(text.slice(cursor, start))
    if (!url) {
      output += escapeHtml(match[0])
    } else {
      const safeUrl = escapeHtml(url)
      output += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>${escapeHtml(trailing)}`
    }
    cursor = start + match[0].length
  }
  return output + escapeHtml(text.slice(cursor))
}

export function packagePath(name) {
  if (!PACKAGE_NAME.test(name)) throw new Error(`Invalid CRAN package name: ${name}`)
  return `/web/packages/${name}/index.html`
}

const basePackages = new Set(['base', 'compiler', 'datasets', 'graphics', 'grDevices', 'grid', 'methods', 'parallel', 'splines', 'stats', 'stats4', 'tcltk', 'tools', 'utils'])

export function linkifyDependencies(value = '', packageNames = new Set()) {
  return String(value).split(',').map(part => {
    const match = /^(\s*)([A-Za-z][A-Za-z0-9.]*)([\s\S]*)$/.exec(part)
    if (!match) return escapeHtml(part)
    const [, space, name, constraint] = match
    const href = basePackages.has(name)
      ? `${CRAN_BASE}/doc/manuals/r-patched/packages/${name}/refman/${name}.html`
      : packageNames.has(name) ? packagePath(name) : null
    return escapeHtml(space) + (href ? `<a href="${escapeHtml(href)}">${escapeHtml(name)}</a>` : escapeHtml(name)) + escapeHtml(constraint)
  }).join(',')
}

export function buildPackageSearchIndex(records) { return records.map(record => [record.Package, String(record.Title || '')]) }

export const REVERSE_CATEGORIES = Object.freeze([
  { field: 'Reverse depends', id: 'depends', label: 'Reverse Depends' },
  { field: 'Reverse imports', id: 'imports', label: 'Reverse Imports' },
  { field: 'Reverse linking to', id: 'linking-to', label: 'Reverse LinkingTo' },
  { field: 'Reverse suggests', id: 'suggests', label: 'Reverse Suggests' },
  { field: 'Reverse enhances', id: 'enhances', label: 'Reverse Enhances' },
])

export function parseReverseDependencies(record) {
  return Object.fromEntries(REVERSE_CATEGORIES.map(({ field, id }) => {
    if (!Object.hasOwn(record, field) || typeof record[field] !== 'string') {
      throw new Error(`Missing reverse metadata ${field} for ${record.Package}; an absent field is not an empty list.`)
    }
    const value = record[field].trim()
    const names = value ? value.split(',').map(name => name.trim()) : []
    const seen = new Set()
    for (const name of names) {
      if (!PACKAGE_NAME.test(name)) throw new Error(`Invalid reverse dependency name in ${field} for ${record.Package}: ${name}`)
      if (seen.has(name)) throw new Error(`Duplicate reverse dependency ${name} in ${field} for ${record.Package}`)
      seen.add(name)
    }
    // ASCII package names: stable ordering without locale/ICU-dependent collation.
    names.sort((a, b) => {
      const lowerA = a.toLowerCase(), lowerB = b.toLowerCase()
      return lowerA < lowerB ? -1 : lowerA > lowerB ? 1 : a < b ? -1 : a > b ? 1 : 0
    })
    return [id, names]
  }))
}

export function reverseDependenciesPath(name) {
  return packagePath(name).replace(/index\.html$/, 'reverse-dependencies.html')
}

export function extractBodyHtml(source) {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(source)
  return match?.[1] || source.replace(/^\s*<!doctype[^>]*>/i, '')
}

export function validateOfficialPage(source, name) {
  if (typeof source !== 'string' || source.length < 80) throw new Error(`Official CRAN page ${name} is empty or unexpectedly short.`)
  if (!/<body\b[^>]*>[\s\S]*<\/body\s*>/i.test(source)) throw new Error(`Official CRAN page ${name} has no complete body element; its HTML structure may have changed.`)
  const body = extractBodyHtml(source).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').trim()
  if (body.length < 40) throw new Error(`Official CRAN page ${name} contains too little readable content.`)
  if (/\b(?:404\s+(?:not found|file not found)|500\s+internal server error|502\s+bad gateway|503\s+service unavailable)\b/i.test(body)) {
    throw new Error(`Official CRAN page ${name} appears to contain an HTTP error document.`)
  }
  return source
}

export function cleanOfficialHtml(source, sourceUrl, localRoutes = {}) {
  let html = extractBodyHtml(source)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<\/?main\b[^>]*>/gi, '')
    .replace(/<h1\b([^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1\s*>/gi, '</h2>')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<(?:base|link|meta)\b[^>]*>/gi, '')
  const rewrite = (attribute, value) => {
    if (/^javascript:/i.test(value)) return '#'
    if (value.startsWith('#') || /^(?:mailto:|tel:)/i.test(value)) return value
    let absolute
    try { absolute = new URL(value, sourceUrl) } catch { return '#' }
    if (!/^https?:$/.test(absolute.protocol)) return '#'
    const local = localRoutes[`${absolute.origin}${absolute.pathname}`]
    return local ? `${local}${absolute.search}${absolute.hash}` : absolute.href
  }
  html = html.replace(/\b(href|src)\s*=\s*(["'])(.*?)\2/gi, (_all, attribute, quote, value) => `${attribute}=${quote}${escapeHtml(rewrite(attribute.toLowerCase(), decodeHtml(value)))}${quote}`)
  const anchorStack = []
  html = html.replace(/<a\b[^>]*>|<\/a\s*>/gi, tag => {
    if (/^<\//.test(tag)) return anchorStack.pop() ? '</a>' : '</span>'
    const hasHref = /\bhref\s*=/i.test(tag)
    anchorStack.push(hasHref)
    if (hasHref) {
      const isPermalink = /\bclass\s*=\s*(["'])[^"']*\bcopiable-link\b[^"']*\1/i.test(tag)
      if (isPermalink && !/\baria-label\s*=/i.test(tag)) return tag.replace(/>$/, ' aria-label="Section permalink">')
      return tag
    }
    const id = /\b(?:id|name)\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]
    const className = /\bclass\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]
    return `<span${id ? ` id="${escapeHtml(id)}"` : ''}${className ? ` class="${escapeHtml(className)}"` : ''}>`
  })
  html = html.replace(/<img\b([^>]*)>/gi, (_all, attributes) => {
    const alt = /\balt\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2]?.trim() || ''
    if (!alt || /^\[(?:ICO|DIR|PARENTDIR|TXT)\]$/i.test(alt)) return ''
    const accessibleAlt = /\balt\s*=/i.test(attributes) ? '' : ' alt=""'
    const source = /\bsrc\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2]
    if (!source) return `<span class="official-image-alt">${escapeHtml(decodeHtml(alt))}</span>`
    return `<img src="${escapeHtml(source)}" alt="${escapeHtml(decodeHtml(alt))}"${accessibleAlt} loading="lazy" decoding="async">`
  })
  html = html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p\s*>/gi, (match, attributes, content) => {
    if (!/\bclass\s*=\s*(["'])[^"']*\bnav-panel\b[^"']*\1/i.test(attributes)) return match
    const navigation = content
      .replace(/,\s*(?=<span\b[^>]*\bclass\s*=\s*(["'])[^"']*\bnav-button\b)/gi, ' ')
      .replace(/\[\s*(<a\b[^>]*>[\s\S]*?<\/a\s*>)\s*\]/gi, '$1')
    return `<p${attributes}>${navigation}</p>`
  })
  html = html.replace(/<span\b(?=[^>]*\bclass=["'][^"']*\bnav-button\b[^"']*["'])[^>]*>(?:\s|&nbsp;|&#160;)*<\/span>/gi, '')
  return html
}

function stableLinks(source, sourceUrl, pattern) {
  const found = []
  const anchors = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi
  for (const match of source.matchAll(anchors)) {
    const href = decodeHtml(match[2])
    const label = match[3].replace(/<[^>]*>/g, '').trim()
    let url
    try { url = new URL(href, sourceUrl).href } catch { continue }
    const candidate = `${label} ${url}`
    const captures = pattern.exec(candidate)
    const version = captures?.[1]
    if (version) found.push({ version, label: label || url.split('/').at(-1), url, ...(captures[2] ? { architecture: captures[2] } : {}) })
  }
  found.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
  return found
}

export function parseWindowsInstaller(source) {
  return stableLinks(source, 'https://cran.r-project.org/bin/windows/base/', /R-(\d+\.\d+\.\d+)-win\.exe/i)[0] || null
}

export function parseMacInstallers(source) {
  const candidates = stableLinks(source, 'https://mac.r-project.org/bin/macosx/', /R-(\d+\.\d+\.\d+)-(arm64|x86_64)\.pkg/i)
  return ['arm64', 'x86_64'].flatMap(architecture => candidates.find(item => item.architecture === architecture) || [])
}
