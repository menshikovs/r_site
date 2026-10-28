# Architecture

## Runtime

Every route is a generated HTML document with a shared local stylesheet. The home page and catalog load one small optional search script; it fetches search data only after a query is submitted. Navigation, package pages, installation pages, and the alphabetic catalog work without JavaScript. There is no database, runtime API, framework, font service, or npm build dependency.

## Source layout

- `src/templates.mjs` - semantic templates for home, package, platform, catalog, mirror, source, and imported official pages.
- `src/cran-data.mjs` - CRAN data parsing, safe link handling, stable installer extraction, HTML conversion, and search index generation.
- `src/site.css` - responsive design, focus states, reduced-motion behavior, and document styling.
- `public/search.js` - optional progressive package search.
- `scripts/fetch-cran-data.mjs` - built-in Node fetch with retries and HTTPS fallback to CRAN-listed mirrors.
- `scripts/fetch-cran-data.R` and `scripts/export-cran-data.R` - local RDS import and metadata export; R does not access the network.
- `scripts/build.mjs` - validation, page generation, and atomic replacement of `dist`.
- `scripts/check-site.mjs` and `scripts/check_html.py` - route, content, and HTML checks.
- `scripts/measure.mjs` - generated size and gzip measurements.
- `tests/` - offline fixture-based Node and R checks.

## Build flow

1. Node fetches the official package RDS, mirror directory, release listings, selected reference pages, source indexes, and HTML manuals. If a canonical CRAN request fails, it can use HTTPS mirrors parsed from the official CRAN mirror directory.
2. R imports the downloaded local RDS, keeps one current record per package, and exports DCF. Node validates package names, versions, record counts, mirror counts, and release installer links.
3. Selected official HTML documents are converted with a reproducible sanitizer: active scripts, inline styles, and external stylesheets are removed; links to migrated routes are rewritten locally; document text and accessible alt text remain.
4. Node generates package pages and a token search index split by token initial. Exact package-name lookup is split into small shards by package initial. Search index files are not loaded when a page first opens.
5. The complete output is written into a staging directory and replaces `dist` only after validation and generation succeed.

Selected manual HTML pages preserve the source text and anchors for released, patched, and development R versions. PDF and EPUB files remain direct official CRAN resources. Large package manuals and individual package vignettes remain CRAN-owned.

## Search

An exact package-name query first downloads one small package-name shard with canonical package names and titles. Other queries load only token shards for their search terms, then title metadata for the top matching packages. Search covers package names, titles, descriptions, and keywords where CRAN provides them. Results link to existing package detail routes. With JavaScript disabled, alphabet navigation and package pages remain available.

## Serving

Node.js and R are build tools, not runtime services. Any static server can serve the generated files. `_headers` supplies short HTML and asset cache lifetimes to hosts that support that convention. CRAN's own cache and compression behavior requires operator configuration.
