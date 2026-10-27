import { useEffect, useState } from 'react'

const base = 'https://cran.r-project.org'
const nav = [
  { id: 'download', label: 'Download R', number: '01' },
  { id: 'packages', label: 'Packages', number: '02' },
  { id: 'documentation', label: 'Documentation', number: '03' },
  { id: 'contribute', label: 'Contribute', number: '04' },
]
const packages = [
  { name: 'ggplot2', category: 'Visualization', text: 'Create elegant graphics with the grammar of graphics.' },
  { name: 'dplyr', category: 'Data manipulation', text: 'A consistent set of tools for working with data frames.' },
  { name: 'tidyr', category: 'Data manipulation', text: 'Turn untidy data into a consistent, useful structure.' },
  { name: 'data.table', category: 'Data manipulation', text: 'Fast aggregation, joins, and efficient data processing.' },
  { name: 'sf', category: 'Spatial analysis', text: 'Work with simple features for spatial data.' },
  { name: 'shiny', category: 'Applications', text: 'Build interactive web applications with R.' },
]

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
function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All packages')
  const [active, setActive] = useState('download')
  const filtered = packages.filter(p => (category === 'All packages' || p.category === category) && `${p.name} ${p.text} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
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
          {[{name:'Windows',type:'windows',url:'windows',note:'Base R for Windows'},{name:'macOS',type:'mac',url:'macosx',note:'Apple silicon & Intel'},{name:'Linux',type:'linux',url:'linux',note:'Debian, Ubuntu, Fedora & more'}].map(os=><a className="download-card" href={`${base}/bin/${os.url}/`} key={os.name}><div className="os-icon"><Icon type={os.type}/></div><h3>{os.name}</h3><p>{os.note}</p><span className="download-card-action">Download R <Arrow diagonal/></span></a>)}
        </div>
        <div className="source-strip"><span className="source-icon" aria-hidden="true">&lt;/&gt;</span><div><strong>Prefer to build from source?</strong><span>Source code, development snapshots, and previous releases.</span></div><a href={`${base}/sources.html`}>Get the source <Arrow diagonal/></a></div>
      </section>
      <section className="packages section" id="packages">
        <div className="section-heading"><div><p className="eyebrow">02 / EXTEND WHAT’S POSSIBLE</p><h2>A package for<br/>your next question.</h2></div><p>From your first plot to your next model.<br/>Explore a few starting points from the archive.</p></div>
        <div className="package-toolbar"><label className="search-field"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span className="sr-only">Filter featured packages</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a featured package…"/></label><label className="category-select"><span className="sr-only">Package category</span><select value={category} onChange={e=>setCategory(e.target.value)}>{['All packages','Visualization','Data manipulation','Spatial analysis','Applications'].map(c=><option key={c}>{c}</option>)}</select></label></div>
        <p className="result-count" role="status">{filtered.length} featured {filtered.length === 1 ? 'package' : 'packages'}{query ? ` matching “${query}”` : ''}</p>
        <div className="package-grid">{filtered.map((p,i)=><a href={`${base}/package=${p.name}`} className="package-card" key={p.name}><div className="package-card-top"><span className={`package-symbol symbol-${i%3}`} aria-hidden="true">{p.name.slice(0,1)}</span><span className="package-category">{p.category}</span><Arrow diagonal/></div><h3>{p.name}</h3><p>{p.text}</p></a>)}</div>
        {filtered.length===0&&<div className="empty-state"><h3>No featured packages found.</h3><p>Try another keyword or browse the complete CRAN package index.</p><button onClick={()=>{setQuery('');setCategory('All packages')}}>Clear filters <Arrow/></button></div>}
        <div className="section-footer"><span>Looking for something more specific?</span><a href={`${base}/web/packages/index.html`}>Browse all packages <Arrow/></a><a href={`${base}/web/views/`}>Explore task views <Arrow diagonal/></a></div>
      </section>
      <section className="documentation section" id="documentation"><div className="section-heading"><div><p className="eyebrow">03 / A LITTLE GUIDANCE GOES A LONG WAY</p><h2>Make yourself<br/>at home with R.</h2></div><a className="text-link" href="https://www.r-project.org/">About the R Project <Arrow diagonal/></a></div><div className="doc-grid"><a href={`${base}/manuals.html`} className="doc-card"><span className="doc-number">01 — LEARN</span><div className="doc-icon" aria-hidden="true">[ R ]</div><h3>The manuals</h3><p>Official guides to the language, installation, administration, and package development.</p><span>Read the documentation <Arrow diagonal/></span></a><a href={`${base}/faqs.html`} className="doc-card"><span className="doc-number">02 — UNDERSTAND</span><div className="doc-icon" aria-hidden="true">?</div><h3>Frequently asked questions</h3><p>Answers to common questions about downloading R, getting started, and licensing.</p><span>Find an answer <Arrow diagonal/></span></a><a href="https://www.r-project.org/help.html" className="doc-card"><span className="doc-number">03 — CONNECT</span><div className="doc-icon" aria-hidden="true">↔</div><h3>Help from the community</h3><p>Find support, ask a good question, and connect with people who work with R.</p><span>Get help with R <Arrow diagonal/></span></a></div></section>
      <section className="contribute section" id="contribute"><div className="contribute-copy"><p className="eyebrow">04 / BUILT TOGETHER</p><h2>Open source.<br/>Shared progress.</h2><p>CRAN connects a worldwide network of servers with the people who create, maintain, and use R packages. There’s a place for your contribution, too.</p><a className="button" href={`${base}/web/packages/policies.html`}>Read the repository policy <Arrow diagonal/></a></div><div className="contribute-links"><a href="https://xmpalantir.wu.ac.at/cransubmit/"><span>01</span><div><h3>Submit a package</h3><p>Share your work with the R community.</p></div><Arrow diagonal/></a><a href={`${base}/mirrors.html`}><span>02</span><div><h3>Find a CRAN mirror</h3><p>Access the archive from a server near you.</p></div><Arrow diagonal/></a><a href="https://www.r-project.org/foundation/donations.html"><span>03</span><div><h3>Support the R Foundation</h3><p>Help sustain the people and infrastructure.</p></div><Arrow diagonal/></a></div></section>
      <footer><div className="footer-main"><Brand/><p>The Comprehensive R Archive Network.<br/>Software, documentation, and a world of possibilities.</p><a href="#top">Back to top ↑</a></div><div className="footer-bottom"><span>CRAN redesign concept · Links lead to official resources.</span><div><a href="mailto:cran-sysadmin@r-project.org">Contact CRAN</a><a href="https://journal.r-project.org/">The R Journal <Arrow diagonal/></a></div></div></footer>
    </main>
  </div>
}
export default App
