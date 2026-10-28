import './platform-page.css'

type PlatformId = 'windows' | 'mac' | 'linux'
type PlatformResource = { category: string; title: string; description: string; href: string; action: string }
type PlatformContent = { title: string; intro: string; source: string; resources: PlatformResource[]; note: string }

const cran = 'https://cran.r-project.org'
const platformContent: Record<PlatformId, PlatformContent> = {
  windows: {
    title: 'R for Windows',
    intro: 'Choose the Windows installer, package binaries, or developer tools from CRAN.',
    source: `${cran}/bin/windows/`,
    resources: [
      { category: 'INSTALL R', title: 'Base distribution', description: 'Binaries for the base distribution. This is what you want to install R for the first time.', href: `${cran}/bin/windows/base/`, action: 'Browse Windows installers' },
      { category: 'PACKAGE BINARIES', title: 'Contributed packages', description: 'Binaries of contributed CRAN packages for current R versions (R 4.0.x and newer).', href: `${cran}/bin/windows/contrib/`, action: 'Browse package binaries' },
      { category: 'OLDER R VERSIONS', title: 'Archived package binaries', description: 'Binaries of contributed CRAN packages for outdated versions of R (R below 4.0.x).', href: 'https://cran-archive.r-project.org/bin/windows/contrib/', action: 'Open CRAN archive' },
      { category: 'DEVELOPER TOOLS', title: 'Rtools', description: 'Tools to build R and R packages on Windows, or to build R itself.', href: `${cran}/bin/windows/Rtools/`, action: 'Explore Rtools' },
      { category: 'HELP & INSTALLATION', title: 'R for Windows FAQ', description: 'Answers to common questions about installing and using R on Windows.', href: `${cran}/bin/windows/base/rw-FAQ.html`, action: 'Read the FAQ' },
    ],
    note: 'CRAN checks Windows binaries for viruses but cannot give guarantees. Use normal precautions with downloaded executables.',
  },
  mac: {
    title: 'R for macOS',
    intro: 'Find the latest signed R installer, package binaries, and tools for macOS.',
    source: `${cran}/bin/macosx/`,
    resources: [
      { category: 'INSTALL R', title: 'Current macOS release', description: 'Choose the latest signed and notarized installer for Apple silicon or Intel Macs on the official CRAN release page.', href: `${cran}/bin/macosx/`, action: 'Choose a macOS installer' },
      { category: 'APPLE SILICON', title: 'Package binaries', description: 'Prebuilt CRAN package binaries for Apple silicon Macs.', href: `${cran}/bin/macosx/sonoma-arm64/`, action: 'Browse Apple silicon packages' },
      { category: 'INTEL MACS', title: 'Package binaries', description: 'Prebuilt CRAN package binaries for Intel-based Macs.', href: `${cran}/bin/macosx/big-sur-x86_64/`, action: 'Browse Intel packages' },
      { category: 'DEVELOPER TOOLS', title: 'Tools for macOS', description: 'Additional tools and compilers used to build R and R packages for Mac.', href: `${cran}/bin/macosx/tools/`, action: 'Explore Mac tools' },
      { category: 'HELP & INSTALLATION', title: 'R for macOS FAQ', description: 'Installation help and answers to common Mac-specific questions.', href: `${cran}/bin/macosx/RMacOSX-FAQ.html`, action: 'Read the FAQ' },
    ],
    note: 'CRAN advises using normal precautions with downloaded installers. The official release page lists supported macOS versions and architecture details.',
  },
  linux: {
    title: 'R for Linux',
    intro: 'Choose installation instructions for your Linux distribution. Package managers and supported releases vary by distribution.',
    source: `${cran}/bin/linux/`,
    resources: [
      { category: 'DEBIAN', title: 'Debian packages', description: 'Install R through Debian packages or follow CRAN instructions for current releases and backports.', href: `${cran}/bin/linux/debian/`, action: 'Read Debian instructions' },
      { category: 'UBUNTU', title: 'Ubuntu packages', description: 'Set up the CRAN repository and install R using instructions for your Ubuntu release.', href: `${cran}/bin/linux/ubuntu/`, action: 'Read Ubuntu instructions' },
      { category: 'FEDORA & RED HAT', title: 'Fedora packages', description: 'Find R packages and installation guidance for Fedora, Red Hat, and related distributions.', href: `${cran}/bin/linux/fedora/`, action: 'Read Fedora instructions' },
      { category: 'GENERAL HELP', title: 'R FAQ', description: 'Learn about Unix-like binaries and installation options for other Linux distributions.', href: `${cran}/doc/manuals/r-patched/R-FAQ.html`, action: 'Read the R FAQ' },
    ],
    note: 'CRAN’s Linux installation instructions are distribution-specific. Check the matching instructions before adding a repository or installing packages.',
  },
}

function PlatformBrand() {
  return <a className="package-brand" href="/" aria-label="CRAN home">
    <img src="/Rlogo.svg" alt="" width="48" height="38" />
    <span><strong>CRAN</strong><small>The R Archive Network</small></span>
  </a>
}

function PlatformMark({ platform }: { platform: PlatformId }) {
  const mark = platform === 'windows' ? '⊞' : platform === 'mac' ? '⌘' : '>_'
  return <span className="platform-mark" aria-hidden="true">{mark}</span>
}

export default function PlatformPage({ platform }: { platform: PlatformId }) {
  const page = platformContent[platform]
  return <div className="package-page platform-page">
    <header className="package-page-header"><PlatformBrand/><span className="package-header-label">THE COMPREHENSIVE R ARCHIVE NETWORK</span><a href={page.source} target="_blank" rel="noreferrer">Official CRAN page <span aria-hidden="true">↗</span></a></header>
    <main className="package-page-main">
      <div className="package-page-actions"><a className="package-back-link" href="/#download"><span aria-hidden="true">←</span> Back to downloads</a><span className="package-status-mark"><i/> INSTALL R</span></div>
      <section className="package-page-hero platform-page-hero">
        <span className="package-status-mark"><i/> {platform === 'mac' ? 'MACOS' : platform.toUpperCase()}</span>
        <div className="platform-heading"><PlatformMark platform={platform}/><h1>{page.title}</h1></div>
        <p className="package-page-title">{page.intro}</p>
      </section>
      <section className="platform-resources" aria-label={`${page.title} download options`}>
        {page.resources.map((resource, index) => <a className="platform-resource-card" href={resource.href} target="_blank" rel="noreferrer" key={resource.title + resource.category}>
          <div className="platform-resource-top"><span className="platform-resource-number">{String(index + 1).padStart(2, '0')}</span><span className="platform-resource-category">{resource.category}</span><span className="platform-resource-arrow" aria-hidden="true">↗</span></div>
          <h2>{resource.title}</h2>
          <p>{resource.description}</p>
          <span className="platform-resource-action">{resource.action}</span>
        </a>)}
      </section>
      <aside className="platform-notice"><span className="package-section-number">BEFORE YOU DOWNLOAD</span><p>{page.note}</p></aside>
      <footer className="package-page-footer"><PlatformBrand/><span>Downloads and installation information from CRAN.</span><a href="/#top">Back to home ↑</a></footer>
    </main>
  </div>
}
