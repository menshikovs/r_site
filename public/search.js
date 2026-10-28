const shardCache = new Map()
const metaCache = new Map()
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

async function loadMeta(firstCharacter) {
  if (!metaCache.has(firstCharacter)) {
    metaCache.set(firstCharacter, fetch(`/assets/search-meta/${firstCharacter}.json`, { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error(`Package titles unavailable (${response.status}).`)
      return response.json()
    }))
  }
  return metaCache.get(firstCharacter)
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
            const item = document.createElement('li')
            const link = document.createElement('a')
            link.href = `/web/packages/${encodeURIComponent(exact[0])}/index.html`
            link.textContent = exact[0]
            item.append(link)
            if (exact[1]) {
              const title = document.createElement('span')
              title.textContent = exact[1]
              item.append(title)
            }
            list.append(item)
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
      const metadata = await Promise.all(initials.map(loadMeta))
      const titleFor = name => metadata[initials.indexOf(name[0].toLowerCase().replace(/[^a-z0-9]/g, '_'))][name] || ''
      output.replaceChildren()
      if (!matches.length) {
        output.textContent = `No CRAN packages found for “${query}”. Try another term or browse by letter.`
        return
      }
      const summary = document.createElement('p')
      summary.textContent = `Top ${matches.length} result${matches.length === 1 ? '' : 's'} for “${query}”`
      const list = document.createElement('ol')
      for (const result of matches) {
        const item = document.createElement('li')
        const link = document.createElement('a')
        link.href = `/web/packages/${encodeURIComponent(result.name)}/index.html`
        link.textContent = result.name
        item.append(link)
        const title = titleFor(result.name)
        if (title) {
          const summary = document.createElement('span')
          summary.textContent = title
          item.append(summary)
        }
        list.append(item)
      }
      output.append(summary, list)
    } catch (error) {
      output.textContent = `${error.message} Browse the alphabetical package catalog instead.`
    } finally {
      form.removeAttribute('aria-busy')
    }
  })
}
