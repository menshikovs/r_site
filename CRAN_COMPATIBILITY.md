# CRAN compatibility

## Generated canonical routes

The build writes the package, platform, documentation, policy, mirror, team, and source-index pages at their existing CRAN paths. Package detail pages retain `/web/packages/<package>/index.html`; the legacy package catalog address redirects without JavaScript. Selected manuals and platform HTML instructions are converted in place at their canonical paths.

## Links that remain at official resources

- Windows, macOS, and source download files remain at the CRAN paths used by package installation and documented downloads. Stable installers are selected from official directory listings at build time.
- PDF and EPUB manuals, package PDF manuals, vignettes, source tarballs, archive files, and mirror status reports remain at their official URLs.
- R-help, R Project news and community pages, package submissions, and donation services belong to separate projects or services and are not copied into this site.
- Older/archived package binaries and old R releases remain on CRAN Archive. These are downloadable distribution trees rather than redesigned information pages.
- The full generated reference manuals for package functions and legacy installation subtrees are not copied. Selected HTML manuals and key platform FAQ/instruction pages use the converter in `src/cran-data.mjs`; PDF/EPUB versions remain unchanged.

This keeps the canonical resource paths and the original CRAN content. Links to archives and generated documents can still render the original CRAN directory/document interface by design.

## Deployment boundary

`dist` is only a front-end overlay and must not replace the existing CRAN document tree. Merge generated pages into the existing directory while preserving all other resources. Some generated index routes overlap with CRAN directory listings. CRAN operators need to decide how to stage, merge, roll back, and configure the web server before any live deployment.

The build emits `_headers` for static hosting providers that support that convention. It does not edit CRAN cache headers, compression, directory-index settings, or server routing. CRAN infrastructure settings are outside this repository.

## Data freshness and completeness

Package metadata and mirrors are fetched from official CRAN sources. Installation listings, manuals, FAQs, policies, team data, Linux instructions, and the base R source listing are fetched from official CRAN/R Project publishing locations during each build. The large contributed-source directory is summarized to avoid copying its full file listing; its package index and archive files remain at their standard CRAN URLs. Any failed or undersized source download stops the build; the previous `dist` remains in place. The converter sanitizes active markup but does not paraphrase source text.

## Search

Search is an optional client enhancement using locally generated JSON shards. The HTML catalog remains complete and browsable by letter when JavaScript is disabled. A static server cannot answer general search GET parameters without JavaScript or a server-side search service, so the no-JavaScript form falls back to the package catalog and alphabetical navigation.
