import { posix } from 'node:path'

// Resolve from the output file, not from the domain root. The same bytes can
// then be mounted at /, /CRAN/ or a deeper prefix without a <base> element.
export function portableHtml(html, route, { mirrorResources = false } = {}) {
  const directory = posix.dirname(route.replace(/^\//, ''))
  function local(value) {
    const [, path, suffix] = /^([^?#]*)(.*)$/.exec(value)
    const relative = posix.relative(directory, path.replace(/^\//, '')) || '.'
    return relative + (path.endsWith('/') ? '/' : '') + suffix
  }
  return html.replace(/<(?:a|img|link|script|form)\b[^>]*>/gi, tag => {
    const canonical = /\brel="canonical"/i.test(tag)
    return tag.replace(/\b(href|src|action)="([^"]*)"/gi, (attribute, name, value) => {
      if (canonical) return `${name}="${value.startsWith('/') && !value.startsWith('//') ? 'https://cran.r-project.org' + value : value}"`
      if (value.startsWith('/') && !value.startsWith('//')) return `${name}="${local(value)}"`
      // Explicit external links (provenance, metadata URLs, mirror selection)
      // retain their destination. Only CRAN repository/document resources move.
      if (mirrorResources && !/\b(?:rel="external"|target="_blank")/i.test(tag)) {
        const match = /^https:\/\/cran\.r-project\.org(\/(?:src|bin|doc|web\/(?:packages|checks|views))(?:\/[^"\s]*)?)$/i.exec(value)
        if (match) return `${name}="${local(match[1])}"`
      }
      return attribute
    })
  }).replace(/(http-equiv="refresh" content="\d+;url=)(\/[^\"]*)/gi, (_, start, value) => start + local(value))
}
