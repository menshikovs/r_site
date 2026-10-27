import { useEffect, useState } from 'react'
import './package-page.css'

type CranPackageDetails = {
  Package: string
  Title?: string
  Description?: string
  Version?: string
  Author?: string | string[]
  Authors?: string | string[]
  Maintainer?: string
  License?: string
  URL?: string | string[]
  BugReports?: string
  Depends?: string | string[]
  Imports?: string | string[]
  Suggests?: string | string[]
  LinkingTo?: string | string[]
  SystemRequirements?: string | string[]
  NeedsCompilation?: string | boolean
  Published?: string
  'Date/Publication'?: string
  [key: string]: unknown
}

const packageApi = 'https://cran.r-universe.dev/api/packages'
const cranWeb = 'https://cran.r-project.org/web/packages'
const siteBase = '/'

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ')
  return ''
}

function PackageBrand() {
  return <a className="package-brand" href={siteBase} aria-label="CRAN home">
    <img src="/Rlogo.svg" alt="" width="48" height="38" />
    <span><strong>CRAN</strong><small>The R Archive Network</small></span>
  </a>
}

export default function PackagePage({ packageName }: { packageName: string }) {
  const [details, setDetails] = useState<CranPackageDetails | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const cranIndex = `${cranWeb}/${encodeURIComponent(packageName)}/index.html`

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setDetails(null)

    fetch(`${packageApi}/${encodeURIComponent(packageName)}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Package metadata is unavailable.')
        return response.json() as Promise<CranPackageDetails>
      })
      .then(payload => {
        if (!payload.Package) throw new Error('Package metadata is incomplete.')
        if (controller.signal.aborted) return
        setDetails(payload)
        setStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })

    return () => controller.abort()
  }, [packageName])

  const metadata = details ? [
    ['Authors', details.Author || details.Authors || details['Authors@R']],
    ['Maintainer', details.Maintainer],
    ['License', details.License],
    ['Project URL', details.URL],
    ['Published', details.Published || details['Date/Publication']],
    ['Requires', details.Depends],
    ['Imports', details.Imports],
    ['Suggests', details.Suggests],
    ['Linking to', details.LinkingTo],
    ['System requirements', details.SystemRequirements],
    ['Needs compilation', details.NeedsCompilation],
    ['Bug reports', details.BugReports],
  ].map(([label, value]) => [String(label), displayValue(value)] as const).filter(([, value]) => value) : []

  return <div className="package-page">
    <header className="package-page-header"><PackageBrand/><span className="package-header-label">THE COMPREHENSIVE R ARCHIVE NETWORK</span><a href={cranIndex} target="_blank" rel="noreferrer">Official CRAN page <span aria-hidden="true">↗</span></a></header>
    <main className="package-page-main">
      <div className="package-page-actions"><a className="package-back-link" href={`${siteBase}#packages`}><span aria-hidden="true">←</span> Browse packages</a><span className="package-status-mark"><i/> PACKAGE DIRECTORY</span></div>
      {status === 'loading' && <section className="package-page-state" aria-live="polite"><span className="package-status-mark"><i/> CONNECTING TO CRAN</span><h1>Loading package details…</h1><p>Fetching the latest package information.</p></section>}
      {status === 'error' && <section className="package-page-state" aria-live="polite"><span className="package-status-mark"><i/> PACKAGE DETAILS</span><h1>{packageName}</h1><p>We couldn’t load the package details right now.</p><a className="package-primary-link" href={cranIndex} target="_blank" rel="noreferrer">Open this package on CRAN <span aria-hidden="true">↗</span></a></section>}
      {status === 'ready' && details && <>
        <section className="package-page-hero">
          <span className="package-status-mark"><i/> CRAN PACKAGE</span>
          <h1>{details.Package}</h1>
          {details.Title && <p className="package-page-title">{details.Title}</p>}
          <div className="package-page-badges">
            {details.Version && <span>VERSION <strong>{details.Version}</strong></span>}
            {details.License && <span>LICENSE <strong>{displayValue(details.License)}</strong></span>}
          </div>
        </section>
        <section className="package-description-panel" aria-labelledby="package-description-heading">
          <div className="package-panel-heading"><div><span className="package-section-number">01 / FROM THE PACKAGE RECORD</span><h2 id="package-description-heading">Description</h2></div><span className="package-description-source">CRAN DESCRIPTION</span></div>
          <p className="package-original-description">{details.Description || 'No description is available for this package.'}</p>
        </section>
        {metadata.length > 0 && <section className="package-metadata-panel" aria-labelledby="package-metadata-heading">
          <div className="package-panel-heading"><div><span className="package-section-number">02 / PACKAGE INFORMATION</span><h2 id="package-metadata-heading">Details</h2></div></div>
          <dl className="package-metadata-grid">{metadata.map(([label, value]) => <div className="package-metadata-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>}
        <section className="package-resource-panel"><div><span className="package-section-number">CONTINUE EXPLORING</span><h2>Go deeper with {details.Package}.</h2><p>Visit the official package record for its reference manual, vignettes, source files, and release history.</p></div><div className="package-resource-links"><a className="package-primary-link" href={cranIndex} target="_blank" rel="noreferrer">Open package on CRAN <span aria-hidden="true">↗</span></a><a href={`${cranWeb}/${encodeURIComponent(packageName)}/vignettes/`} target="_blank" rel="noreferrer">Browse vignettes <span aria-hidden="true">↗</span></a></div></section>
      </>}
      <footer className="package-page-footer"><PackageBrand/><span>Package text and metadata provided by CRAN.</span><a href={`${siteBase}#top`}>Back to home ↑</a></footer>
    </main>
  </div>
}
