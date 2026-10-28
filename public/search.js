const shardCache = new Map()
const nameCache = new Map()
const tokens = value => [...new Set((value.normalize('NFKD').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) || []).filter(token => token.length > 1))]

async function loadShard(firstCharacter) {
  if (!shardCache.has(firstCharacter)) {
    shardCache.set(firstCharacter, fetch(`/assets/search/${firstCharacter}.json`, { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error(`Search data unavailable (${response.status}).`)
      return response.json()
    }))
  }
  return shardCache.get(firstCharacter)
}

async function loadNameShard(firstCharacter) {
  if (!nameCache.has(firstCharacter)) {
    nameCache.set(firstCharacter, fetch(`/assets/search-names/${firstCharacter}.json`, { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error(`Package names unavailable (${response.status}).`)
      return response.json()
    }))
  }
  return nameCache.get(firstCharacter)
}

function searchResult(name, title = '', description = '') {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.className = 'search-result'
  link.href = `/web/packages/${encodeURIComponent(name)}/index.html`
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
  if (description) {
    const packageDescription = document.createElement('p')
    packageDescription.className = 'search-result-description'
    packageDescription.textContent = description
    link.append(packageDescription)
  }
  item.append(link)
  return item
}

for (const form of document.querySelectorAll('.package-search')) {
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const input = form.querySelector('input[type="search"]')
    const output = form.querySelector('.search-results')
    const query = input.value.trim()
    const terms = tokens(query)
    output.replaceChildren()
    if (!terms.length) {
      output.textContent = 'Enter at least two letters to search.'
      input.focus()
      return
    }
    output.textContent = 'Searching package names and descriptions…'
    form.setAttribute('aria-busy', 'true')
    try {
      const exactName = query.normalize('NFKD').toLocaleLowerCase('en-US')
      if (/^[a-z][a-z0-9.]+$/.test(exactName)) {
        try {
          const exact = (await loadNameShard(exactName[0]))[exactName]
          if (exact) {
            const summary = document.createElement('p')
            summary.textContent = `Exact package match for “${query}”`
            const list = document.createElement('ol')
            list.append(searchResult(exact[0], exact[1], exact[2]))
            output.replaceChildren(summary, list)
            return
          }
        } catch {
          // Fall back to the complete token search if the small name index is unavailable.
        }
      }
      const uniqueShards = [...new Set(terms.map(term => term[0].replace(/[^a-z0-9]/g, '_')))]
      const loaded = await Promise.all(uniqueShards.map(loadShard))
      const results = new Map()
      for (let i = 0; i < terms.length; i += 1) {
        const postings = loaded[uniqueShards.indexOf(terms[i][0].replace(/[^a-z0-9]/g, '_'))][terms[i]] || []
        for (const [name, weight] of postings) {
          const result = results.get(name) || { name, score: 0, terms: 0 }
          result.score += weight
          result.terms += 1
          results.set(name, result)
        }
      }
      const matches = [...results.values()]
        .map(result => ({ ...result, score: result.score + (result.terms === terms.length ? 10 : 0) }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 20)
      const initials = [...new Set(matches.map(result => result.name[0].toLowerCase().replace(/[^a-z0-9]/g, '_')))]
      const metadata = await Promise.all(initials.map(loadNameShard))
      const metadataFor = name => metadata[initials.indexOf(name[0].toLowerCase().replace(/[^a-z0-9]/g, '_'))][name.toLocaleLowerCase('en-US')] || []
      output.replaceChildren()
      if (!matches.length) {
        output.textContent = `No CRAN packages found for “${query}”. Try another term or browse by letter.`
        return
      }
      const summary = document.createElement('p')
      summary.textContent = `Top ${matches.length} result${matches.length === 1 ? '' : 's'} for “${query}”`
      const list = document.createElement('ol')
      for (const result of matches) {
        const [packageName, title, description] = metadataFor(result.name)
        list.append(searchResult(packageName || result.name, title, description))
      }
      output.append(summary, list)
    } catch (error) {
      output.textContent = `${error.message} Browse the alphabetical package catalog instead.`
    } finally {
      form.removeAttribute('aria-busy')
    }
  })
}
