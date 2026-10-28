# CRAN redesign

An independent redesign concept for the Comprehensive R Archive Network. The project has not been adopted by the CRAN team and is not the official CRAN website. Pages are generated as static HTML and CSS, with one small optional JavaScript enhancement for package search and no npm dependencies.

## Requirements

- Node.js 20 or newer and R 4.0 or newer to build.
- Network access to official CRAN resources during the build.
- Python 3 for the optional generated-HTML check.
- No application server: the output can be served from an ordinary static host.

## Build and preview

```sh
npm test
Rscript tests/export-cran-data.R
npm run build
npm run check:site
python scripts/check_html.py dist
npm run measure
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000/`. Node's built-in `fetch` downloads current package metadata, release listings, selected HTML resources, and mirror data from CRAN, with fallback to HTTPS mirrors listed in CRAN's official mirror directory. R reads the local official package RDS and exports its metadata; Node validates and generates the static site. The build writes a new `dist` only after all inputs are available. No npm install or additional package is required.

Search is progressively enhanced: the home page and package catalog search package names only, ignoring case. Exact matches rank first, followed by prefixes and other partial matches. Results show the package name and title when available; titles are display-only. One compact index is fetched after submission. With JavaScript disabled, the full alphabetical index and all package pages still work.

## Generated canonical routes

- `/`, `/bin/windows/`, `/bin/macosx/`, `/bin/linux/`
- `/web/packages/`, `/web/packages/by-name/<letter>.html`, `/web/packages/<package>/index.html`
- `/mirrors.html`, `/manuals.html`, `/faqs.html`, `/mirror-howto.html`, `/web/packages/policies.html`, `/CRAN_team.htm`
- `/bin/windows/base/`, `/bin/windows/contrib/`, `/bin/windows/Rtools/`, `/bin/windows/base/rw-FAQ.html`
- `/bin/macosx/contrib/`, `/bin/macosx/tools/`, `/bin/macosx/RMacOSX-FAQ.html`
- `/bin/linux/debian/`, `/bin/linux/ubuntu/`, `/bin/linux/fedora/`
- `/doc/manuals/{r-release,r-patched,r-devel}/{R-FAQ,R-intro,R-data,R-admin,R-exts,R-lang,R-ints}.html`
- `/src/`, `/src/base/`, `/src/contrib/`

The former `/web/packages/available_packages_by_name.html` address redirects without JavaScript. Stable Windows and macOS installers are extracted from official release listings during the build; versions are not hardcoded. Package source archives, PDF/EPUB manuals, vignettes, and live mirror-monitoring reports remain at their official CRAN URLs.

## Deployment boundary

`dist` is a static overlay, not a copy of the CRAN archive. Preserve CRAN's existing binaries, source archives, vignettes, manuals, and package data when deploying generated pages. Do not replace the CRAN document root with `dist` wholesale. The generated `_headers` file provides cache rules for static hosts that support that convention; CRAN server caching, compression, and deployment behavior are controlled by its operators.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md), [CRAN_COMPATIBILITY.md](CRAN_COMPATIBILITY.md), [PERFORMANCE.md](PERFORMANCE.md), [CRAN_PROPOSAL.md](CRAN_PROPOSAL.md), and [CONTRIBUTING.md](CONTRIBUTING.md). For independent static hosting, see [deploy/README.md](deploy/README.md).

## Assets and identity

The R logo in `public/Rlogo.svg` was retrieved from CRAN. Logo information is available at https://www.r-project.org/logo/. The logo belongs to the R Project.
