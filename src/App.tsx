import { useEffect, useState } from 'react'
import PackagePage from './PackagePage'

const base = 'https://cran.r-project.org'
const nav = [
  { id: 'download', label: 'Download R', number: '01' },
  { id: 'packages', label: 'Packages', number: '02' },
  { id: 'documentation', label: 'Documentation', number: '03' },
  { id: 'contribute', label: 'Contribute', number: '04' },
]
const cranSearchEndpoint = 'https://cran.r-universe.dev/api/search'
const cranPackageListEndpoint = 'https://cran.r-universe.dev/api/ls'
const cranPackageEndpoint = 'https://cran.r-universe.dev/api/packages'
const packagePageSize = 12

type CranSearchPackage = { Package: string; Title?: string; Description?: string }
type CranSearchResponse = { results?: CranSearchPackage[]; total?: number }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} /></svg>
}
function Icon({ type }: { type: string }) {
  if (type === 'windows') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m3 6 11-1.5V15H3V6Zm13-1.8L29 2.5V15H16V4.2ZM3 17h11v10.5L3 26V17Zm13 0h13v12.5l-13-1.8V17Z" fill="currentColor"/></svg>
  if (type === 'mac') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M21 7c1.4-1.5 1.2-3.8 1.2-3.8s-2.2.1-3.6 1.7c-1.3 1.4-1.1 3.4-1.1 3.4S19.6 8.6 21 7Zm4.4 13c-.6 1.4-.9 2-1.7 3.2-1.1 1.7-2.6 3.9-4.5 3.9-1.7 0-2.1-1.1-4.4-1.1s-2.8 1.1-4.5 1.1c-1.8 0-3.3-2-4.4-3.7C2.8 18.6 3 12.3 6.4 9.8c2.4-1.8 5.1-1.1 6.9-.4 1.3.5 2 .5 3.4 0 1.8-.7 4.7-1.4 7.1.5-4.3 2.4-3.6 8.4 1.6 10.1Z" fill="currentColor"/></svg>
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="5" width="26" height="22" rx="4"/><path d="m8 12 4 4-4 4m8 0h7"/></svg>
}
function Brand() {
  return <a className="brand" href="#top" aria-label="CRAN home"><img src="/Rlogo.svg" alt="R logo" width="58" height="45"/><span><strong>CRAN</strong><small>The R Archive Network</small></span></a>
}
function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('download')
  const [cranResults, setCranResults] = useState<CranSearchPackage[]>([])
  const [cranPackageNames, setCranPackageNames] = useState<string[]>([])
  const [cranTotal, setCranTotal] = useState(0)
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading')
  const [page, setPage] = useState(0)
  const displayPackages = cranResults.map(result => ({
    name: result.Package,
    category: 'CRAN package',
    title: result.Title || '',
    text: result.Description || 'View package details on CRAN.',
  }))

  useEffect(() => {
    const requestController = new AbortController()
    fetch(cranPackageListEndpoint, { signal: requestController.signal })
      .then(response => {
        if (!response.ok) throw new Error('CRAN package list failed.')
        return response.json() as Promise<string[]>
      })
      .then(names => {
        if (Array.isArray(names)) setCranPackageNames(names)
      })
      .catch(() => {
        if (!requestController.signal.aborted) setCranPackageNames([])
      })
    return () => requestController.abort()
  }, [])

  useEffect(() => {
    const term = query.trim()
    const requestController = new AbortController()
    setSearchStatus('loading')
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: term,
          limit: String(packagePageSize),
          skip: String(page * packagePageSize),
        })
        const response = await fetch(`${cranSearchEndpoint}?${params}`, {
          signal: requestController.signal,
        })
        if (!response.ok) throw new Error('CRAN package search failed.')

        const payload = await response.json() as CranSearchResponse
        if (!Array.isArray(payload.results) || typeof payload.total !== 'number') {
          throw new Error('CRAN package search returned an invalid response.')
        }
        let results = payload.results
        let total = payload.total
        const exactPackageName = term
          ? cranPackageNames.find(name => name.toLowerCase() === term.toLowerCase())
          : undefined

        if (exactPackageName && !results.some(result => result.Package.toLowerCase() === exactPackageName.toLowerCase())) {
          const exactResponse = await fetch(`${cranPackageEndpoint}/${encodeURIComponent(exactPackageName)}`, {
            signal: requestController.signal,
          }).catch(() => null)
          if (exactResponse?.ok) {
            const exactPackage = await exactResponse.json() as CranSearchPackage
            if (exactPackage.Package) {
              results = [exactPackage, ...results].slice(0, packagePageSize)
              total = Math.max(total, results.length)
            }
          }
        }

        if (requestController.signal.aborted) return
        setCranResults(results)
        setCranTotal(total)
        setSearchStatus('ready')
      } catch {
        if (!requestController.signal.aborted) setSearchStatus('error')
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      requestController.abort()
    }
  }, [query, page, cranPackageNames])

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onEscape)
    const observer = new IntersectionObserver(entries => { const entry = entries.find(e => e.isIntersecting); if (entry) setActive(entry.target.id) }, { rootMargin: '-15% 0px -65% 0px' })
    nav.forEach(n => { const el = document.getElementById(n.id); if (el) observer.observe(el) })
    return () => { window.removeEventListener('keydown', onEscape); observer.disconnect() }
  }, [])
  return <div id="top" className="app">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="sidebar-top"><Brand/><button className="menu-button" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}<span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button></div>
      <nav id="main-nav" className="main-nav" aria-label="Main navigation"><p className="nav-label">EXPLORE THE ARCHIVE</p>{nav.map(n => <a href={`#${n.id}`} key={n.id} onClick={() => setMenuOpen(false)} className={active === n.id ? 'active' : ''} aria-current={active === n.id ? 'location' : undefined}><span>{n.number}</span>{n.label}<i/></a>)}<div className="nav-divider"/><a href={`${base}/mirrors.html`}><span>↗</span>CRAN mirrors</a><a href="https://www.r-project.org/news.html"><span>↗</span>What’s new</a><a href={`${base}/CRAN_team.htm`}><span>↗</span>CRAN team</a></nav>
      <div className="sidebar-bottom"><div className="network-mark" aria-hidden="true"><i/><i/><i/><i/><i/></div><p>A global network.<br/>An open community.</p><a href="https://www.r-project.org/">The R Project <Arrow diagonal/></a></div>
    </aside>
    <main id="main" className="main-content">
      <header className="topbar"><span><i/> Open source. Open possibilities.</span><a href={`${base}/mirrors.html`}>Choose a mirror <Arrow diagonal/></a></header>
      <section id="download" className="hero">
        <div className="hero-heading"><p className="eyebrow">THE COMPREHENSIVE R ARCHIVE NETWORK</p><h1>Your next discovery<br/>starts with <span>R.</span></h1><p className="hero-description">Download R, explore packages, and find the tools<br className="desktop-break"/> to turn your data into understanding.</p></div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><span className="orbit-dot d1"/><span className="orbit-dot d2"/><span className="orbit-dot d3"/><div className="orbit-core"><img src="/Rlogo.svg" alt=""/></div><span className="orbit-label l1">STATISTICS</span><span className="orbit-label l2">GRAPHICS</span><span className="orbit-label l3">DISCOVERY</span></div>
        <div className="download-heading"><div><h2>Download and install R</h2><p>Choose your operating system to get started.</p></div><span className="availability"><i/> FREE & OPEN SOURCE</span></div>
        <div className="download-grid">
          {[{name:'Windows',type:'windows',url:'windows',note:'Base R for Windows'},{name:'macOS',type:'mac',url:'macosx',note:'Apple silicon & Intel'},{name:'Linux',type:'linux',url:'linux',note:'Debian, Ubuntu, Fedora & more'}].map(os=><a className="download-card" href={`${base}/bin/${os.url}/`} key={os.name}><div className="download-card-top"><div className="os-icon"><Icon type={os.type}/></div><span className="download-card-category">R FOR {os.name.toUpperCase()}</span><Arrow diagonal/></div><h3>{os.name}</h3><p>{os.note}</p><span className="download-card-action">Download R</span></a>)}
        </div>
        <div className="source-strip"><span className="source-icon" aria-hidden="true">&lt;/&gt;</span><div><strong>Prefer to build from source?</strong><span>Source code, development snapshots, and previous releases.</span></div><a href={`${base}/sources.html`}>Get the source <Arrow diagonal/></a></div>
      </section>
      <section className="packages section" id="packages">
        <div className="section-heading"><div><p className="eyebrow">02 / EXTEND WHAT’S POSSIBLE</p><h2>A package for<br/>your next question.</h2></div><p>Browse the CRAN catalog or search by package name and description.</p></div>
        <div className="package-toolbar">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
            <span className="sr-only">Search all CRAN packages by name or description</span>
            <input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="Search all CRAN packages…"/>
          </label>
        </div>
        <p className="result-count" role="status">
          {searchStatus === 'loading' && (query.trim() ? `Searching CRAN for “${query.trim()}”…` : 'Loading all CRAN packages…')}
          {searchStatus === 'ready' && cranTotal > 0 && `Showing ${page * packagePageSize + 1}–${Math.min((page + 1) * packagePageSize, cranTotal)} of ${cranTotal.toLocaleString()} ${query.trim() ? 'matching ' : ''}CRAN packages`}
          {searchStatus === 'ready' && cranTotal === 0 && (query.trim() ? `No CRAN packages found for “${query.trim()}”.` : 'The CRAN package index is empty.')}
          {searchStatus === 'error' && 'CRAN package search is unavailable.'}
        </p>
        {searchStatus === 'loading' && <div className="search-loading" aria-hidden="true">Loading the CRAN package catalog…</div>}
        {searchStatus === 'error' && <div className="empty-state"><h3>Could not reach package search.</h3><p>You can still browse the complete CRAN package index.</p><a className="text-link" href={`${base}/web/packages/available_packages_by_name.html`}>Open the CRAN package index <Arrow diagonal/></a></div>}
        {searchStatus === 'ready' && cranResults.length === 0 && <div className="empty-state"><h3>No matching CRAN packages found.</h3><p>Try another search or browse the complete CRAN package index.</p><a className="text-link" href={`${base}/web/packages/available_packages_by_name.html`}>Browse all CRAN packages <Arrow diagonal/></a></div>}
        {searchStatus === 'ready' && displayPackages.length > 0 && <div className="package-grid">{displayPackages.map((p,i)=><a href={`/package/${encodeURIComponent(p.name)}`} className="package-card" key={p.name}><div className="package-card-top"><span className={`package-symbol symbol-${i%3}`} aria-hidden="true">{p.name.slice(0,1)}</span><span className="package-category">{p.category}</span><Arrow diagonal/></div><h3>{p.name}</h3>{p.title && <p className="package-title">{p.title}</p>}<p className="package-description">{p.text}</p></a>)}</div>}
        {searchStatus === 'ready' && cranTotal > packagePageSize && <nav className="package-pagination" aria-label="CRAN package search pages"><button type="button" disabled={page === 0} onClick={()=>setPage(current=>current-1)}>Previous</button><span>Page {page + 1} of {Math.ceil(cranTotal / packagePageSize)}</span><button type="button" disabled={(page + 1) * packagePageSize >= cranTotal} onClick={()=>setPage(current=>current+1)}>Next</button></nav>}
        <div className="section-footer"><span>Looking for something more specific?</span><a href={`${base}/web/packages/available_packages_by_name.html`}>Browse all packages <Arrow/></a><a href={`${base}/web/views/`}>Explore task views <Arrow diagonal/></a></div>
      </section>
      <section className="documentation section" id="documentation"><div className="section-heading"><div><p className="eyebrow">03 / A LITTLE GUIDANCE GOES A LONG WAY</p><h2>Make yourself<br/>at home with R.</h2></div><a className="text-link" href="https://www.r-project.org/">About the R Project <Arrow diagonal/></a></div><div className="doc-grid"><a href={`${base}/manuals.html`} className="doc-card"><span className="doc-number">01 — LEARN</span><div className="doc-icon" aria-hidden="true">[ R ]</div><h3>The manuals</h3><p>Official guides to the language, installation, administration, and package development.</p><span>Read the documentation <Arrow diagonal/></span></a><a href={`${base}/faqs.html`} className="doc-card"><span className="doc-number">02 — UNDERSTAND</span><div className="doc-icon" aria-hidden="true">?</div><h3>Frequently asked questions</h3><p>Answers to common questions about downloading R, getting started, and licensing.</p><span>Find an answer <Arrow diagonal/></span></a><a href="https://www.r-project.org/help.html" className="doc-card"><span className="doc-number">03 — CONNECT</span><div className="doc-icon" aria-hidden="true">↔</div><h3>Help from the community</h3><p>Find support, ask a good question, and connect with people who work with R.</p><span>Get help with R <Arrow diagonal/></span></a></div></section>
      <section className="contribute section" id="contribute"><div className="contribute-copy"><p className="eyebrow">04 / BUILT TOGETHER</p><h2>Open source.<br/>Shared progress.</h2><p>CRAN connects a worldwide network of servers with the people who create, maintain, and use R packages. There’s a place for your contribution, too.</p><a className="button" href={`${base}/web/packages/policies.html`}>Read the repository policy <Arrow diagonal/></a></div><div className="contribute-links"><a href="https://xmpalantir.wu.ac.at/cransubmit/"><span>01</span><div><h3>Submit a package</h3><p>Share your work with the R community.</p></div><Arrow diagonal/></a><a href={`${base}/mirrors.html`}><span>02</span><div><h3>Find a CRAN mirror</h3><p>Access the archive from a server near you.</p></div><Arrow diagonal/></a><a href="https://www.r-project.org/foundation/donations.html"><span>03</span><div><h3>Support the R Foundation</h3><p>Help sustain the people and infrastructure.</p></div><Arrow diagonal/></a></div></section>
      <footer><div className="footer-main"><Brand/><p>The Comprehensive R Archive Network.<br/>Software, documentation, and a world of possibilities.</p><a href="#top">Back to top ↑</a></div><div className="footer-bottom"><span>CRAN redesign concept · Links lead to official resources.</span><div><a href="mailto:cran-sysadmin@r-project.org">Contact CRAN</a><a href="https://journal.r-project.org/">The R Journal <Arrow diagonal/></a></div></div></footer>
    </main>
  </div>
}
function App() {
  const packagePrefix = '/package/'
  if (!window.location.pathname.startsWith(packagePrefix)) return <HomePage />

  const packageSegment = window.location.pathname.slice(packagePrefix.length).split('/')[0]
  let packageName = ''
  try {
    packageName = decodeURIComponent(packageSegment)
  } catch {
    return <HomePage />
  }

  if (!/^[A-Za-z][A-Za-z0-9.]*$/.test(packageName)) return <HomePage />
  return <PackagePage packageName={packageName} />
}

export default App
