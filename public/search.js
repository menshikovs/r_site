let packageIndexPromise

const normalizePackageName = value => String(value).normalize('NFKD').toLocaleLowerCase('en-US')

export function createPackageSearchIndex(entries) {
  return entries.map(([name, title]) => ({ name, title, normalized: normalizePackageName(name) }))
}

export function findPackageMatches(index, query, limit = 20) {
  const normalizedQuery = normalizePackageName(query.trim())
  if (!normalizedQuery) return []

  return index
    .filter(entry => entry.normalized.includes(normalizedQuery))
    .map(entry => ({
      ...entry,
      rank: entry.normalized === normalizedQuery ? 0 : entry.normalized.startsWith(normalizedQuery) ? 1 : 2,
    }))
    .sort((a, b) => a.rank - b.rank || a.normalized.localeCompare(b.normalized, 'en-US') || a.name.localeCompare(b.name, 'en-US'))
    .slice(0, limit)
}

async function loadPackageIndex() {
  if (!packageIndexPromise) {
    packageIndexPromise = fetch('/assets/package-search.json', { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error('Package-name index unavailable.')
      return response.json()
    }).then(createPackageSearchIndex)
  }
  return packageIndexPromise
}

function searchResult(name, title = '') {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.className = 'search-result'
  link.href = '/web/packages/' + encodeURIComponent(name) + '/index.html'

  const packageName = document.createElement('strong')
  packageName.className = 'search-result-name'
  packageName.textContent = name
  link.append(packageName)

  if (title) {
    const packageTitle = document.createElement('span')
    packageTitle.className = 'search-result-title'
    packageTitle.textContent = title
    link.append(packageTitle)
  }

  item.append(link)
  return item
}

if (typeof document !== 'undefined') for (const form of document.querySelectorAll('.package-search')) {
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const input = form.querySelector('input[type="search"]')
    const output = form.querySelector('.search-results')
    const query = input.value.trim()
    output.replaceChildren()

    if (!query) {
      output.textContent = 'Enter a package name to search.'
      input.focus()
      return
    }

    output.textContent = 'Searching package names...'
    form.setAttribute('aria-busy', 'true')
    try {
      const matches = findPackageMatches(await loadPackageIndex(), query)
      if (!matches.length) {
        output.textContent = 'No package names match "' + query + '". Try another name or browse the alphabetical catalog.'
        return
      }

      const summary = document.createElement('p')
      summary.textContent = 'Top ' + matches.length + ' package-name match' + (matches.length === 1 ? '' : 'es') + ' for "' + query + '".'
      const list = document.createElement('ol')
      for (const match of matches) list.append(searchResult(match.name, match.title))
      output.replaceChildren(summary, list)
    } catch {
      output.textContent = 'Package-name search is unavailable. Browse the alphabetical package catalog.'
    } finally {
      form.removeAttribute('aria-busy')
    }
  })
}
