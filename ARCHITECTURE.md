# Architecture

## Runtime

The build writer converts internal navigation/assets to page-relative URLs;
the same generated tree can be mounted at a domain root or a subdirectory
without `<base>` or route-fixing JavaScript. Optional search resolves its index
and result paths from its module URL. `CRAN_MIRROR_RESOURCES=1` additionally
localizes repository/document resource links for an approved full-tree overlay;
it does not supply the native files. The default standalone build keeps central
fallbacks for those resources. Provenance and canonical metadata remain central.
See [the mirror audit](CRAN_MIRROR_COMPATIBILITY.md) for tested scope and limits.

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
2. R imports the downloaded local RDS, keeps one current record per package, and exports UTF-8 DCF. All five reverse dependency columns are required. NA cells in these known columns become explicit empty fields; a missing column fails the build. Node validates package names, versions, record counts, reverse names/duplicates, mirror counts, and release installer links.
3. Selected official HTML documents are converted with a reproducible sanitizer: active scripts, inline styles, and external stylesheets are removed; links to migrated routes are rewritten locally; document text and accessible alt text remain.
4. Node generates package pages and one compact package-name/title index. Package pages contain only five reverse counts. Nonempty reverse lists get a separate `reverse-dependencies.html` with five permanent section anchors, built from the same records. The optional search script loads its unchanged index only after a search is submitted.
5. The complete output is written into a staging directory and replaces `dist` only after validation and generation succeed.

Selected manual HTML pages preserve the source text and anchors for released, patched, and development R versions. PDF and EPUB files remain direct official CRAN resources. Large package manuals and individual package vignettes remain CRAN-owned.

## Reverse dependencies

`Reverse depends`, `Reverse imports`, `Reverse linking to`, `Reverse suggests`,
and `Reverse enhances` come from the already downloaded official RDS, not from
inverting an incomplete local graph or crawling package HTML. They are parsed as
comma-separated names with surrounding whitespace/DCF wrapping removed. Invalid
names, absent fields and duplicates within one category fail before staging.
Duplicates across categories remain separate relationships. Lists use a stable
case-insensitive ASCII order with a case-sensitive tie break.

Only packages present in the same current snapshot receive local canonical
links. Other dependent names are plain text; no repository is guessed and no
placeholder page or official package URL is fabricated. No additional JSON index,
runtime API or JavaScript is used. Empty categories are explicit zeroes without
links; packages with five empty categories have no separate reverse page.

The five anchors are `depends`, `imports`, `linking-to`, `suggests`, `enhances`.
The existing staging/publish operation includes both levels. `check:site` verifies
every main/reverse count pair, list length, anchor, local target and external-name
treatment across the complete release.

Measurement runs may set `CRAN_BUILD_AUDIT_DIR` to retain the exact RDS, DCF and
SHA-256 metadata outside `dist`. Optional `CRAN_BUILD_MAX_ADDED_BYTES` caps reverse
HTML plus main summaries before publication; it does not cap ordinary builds or
hard-code a number of reverse pages. See the reverse implementation measurements
in `PERFORMANCE.md` and `audits/reverse-dependencies/2026-10-29/`.

## Search

Search matches package names only, without regard to case. Exact names rank first, followed by prefixes and then other substring matches. Titles appear in results for display and do not affect matching. The single compact JSON index contains only package names and titles and is fetched after submission. With JavaScript disabled, alphabet navigation and package pages remain available.

## Serving

Node.js and R are build tools, not runtime services. Any static server can serve the generated files. `_headers` supplies short HTML and asset cache lifetimes to hosts that support that convention. CRAN's own cache and compression behavior requires operator configuration.
