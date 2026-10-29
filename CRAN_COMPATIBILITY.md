# CRAN compatibility

## Generated canonical routes

The mirror portability update preserves these output paths and writes internal
links relative to each output page. Root, `/CRAN/` and `/pub/CRAN/` mounts were
tested. Search JSON/results resolve from the module URL. Optional
`CRAN_MIRROR_RESOURCES=1` localizes ordinary CRAN resource links only when an
operator supplies a complete merged native tree; standalone builds retain their
central fallbacks. Explicit provenance/external links stay external. Short URLs
require separate server rules and are not generated aliases. Absolute central
long URLs are the current HTML canonical policy, pending CRAN agreement.
See [CRAN_MIRROR_COMPATIBILITY.md](CRAN_MIRROR_COMPATIBILITY.md), including remaining
manual fragments, inventory gaps and rsync consistency limitations.

The build writes the package, platform, documentation, policy, mirror, team, and source-index pages at their existing CRAN paths. Package detail pages retain `/web/packages/<package>/index.html`; the legacy package catalog address redirects without JavaScript. Selected manuals and platform HTML instructions are converted in place at their canonical paths.

## Links that remain at official resources

- Windows, macOS, and source download files remain at the CRAN paths used by package installation and documented downloads. Stable installers are selected from official directory listings at build time.
- PDF and EPUB manuals, package PDF manuals, vignettes, source tarballs, archive files, and mirror status reports remain at their official URLs.
- R-help, R Project news and community pages, package submissions, and donation services belong to separate projects or services and are not copied into this site.
- Older/archived package binaries and old R releases remain on CRAN Archive. These are downloadable distribution trees rather than redesigned information pages.
- The full generated reference manuals for package functions and legacy installation subtrees are not copied. Selected HTML manuals and key platform FAQ/instruction pages use the converter in `src/cran-data.mjs`; PDF/EPUB versions remain unchanged.

Generated pages retain the long CRAN paths, while uncopied downloads and documents remain at official resources. This does not preserve all package-page information. Links to archives and generated documents can still render the original CRAN directory/document interface by design.

Package-page information is not yet complete enough to replace CRAN's interface.
The [functional parity audit](CRAN_FUNCTIONAL_PARITY.md) records remaining gaps
in resource inventories, binary variants, Task Views and citation navigation.
Reverse dependencies are now generated from the official package RDS: compact
counts on each main page and complete static lists on
`/web/packages/<package>/reverse-dependencies.html` only for nonempty records.
Both levels work without JavaScript and share one snapshot. External dependent
names absent from that snapshot are plain text, not guessed CRAN links. An
official-page link provides access to other original resources; it does not
establish full information parity.

## Deployment boundary

`dist` is only a front-end overlay and must not replace the existing CRAN document tree. Merge generated pages into the existing directory while preserving all other resources. Some generated index routes overlap with CRAN directory listings. CRAN operators need to decide how to stage, merge, roll back, and configure the web server before any live deployment.

The build emits `_headers` for static hosting providers that support that convention. It does not edit CRAN cache headers, compression, directory-index settings, or server routing. CRAN infrastructure settings are outside this repository.

## Data freshness and completeness

Package metadata and mirrors are fetched from official CRAN sources. Installation listings, manuals, FAQs, policies, team data, Linux instructions, and the base R source listing are fetched from official CRAN/R Project publishing locations during each build. The large contributed-source directory is summarized to avoid copying its full file listing; its package index and archive files remain at their standard CRAN URLs. Any failed or undersized source download stops the build; the previous `dist` remains in place. The converter sanitizes active markup but does not paraphrase source text.

## Search

Search is an optional client enhancement using one `[Package, Title]` JSON index, matched by package name only. The HTML catalog remains complete and browsable by letter when JavaScript is disabled. A static server cannot answer general search GET parameters without JavaScript or a server-side search service, so the no-JavaScript form falls back to the package catalog and alphabetical navigation.
