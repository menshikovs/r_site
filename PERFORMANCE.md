# Performance and release checks

## Reproduce measurements

Build the site and serve `dist/` with a static web server. The dependency-free benchmark uses Node's built-in `fetch` and the same package matching functions as the browser:

```powershell
npm run build
node scripts/benchmark.mjs --baseline https://cran.r-project.org --candidate http://127.0.0.1:8080 --runs 5
```

The script reports request counts, response bytes after HTTP decompression, median TTFB/response time, and package-name matching cost. Browser timing below measures the interval from submitting the query to results appearing. Use the same viewport and disable cache when reproducing it. Lighthouse is optional and is not a project dependency.

## CRAN data source and current build

The earlier R download failure was caused by `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` pointing to `http://127.0.0.1:9`, where no proxy service was listening. R 4.5.2 libcurl also could not connect directly in that environment. Node's built-in `fetch` reached the canonical CRAN host and official HTTPS mirrors. The build retains retries, official mirror fallback, and package-count, mirror-count, installer, and source-page validation.

The build completed on 2026-10-28 from the canonical CRAN package RDS: **25,579 packages** and **81 mirrors**. `dist/` contains **25,656 files**, including **25,651 HTML pages**. A failed fetch still stops the build before it stages or replaces `dist`.

## WSL Nginx page measurements

Measurements used Ubuntu WSL Nginx at `http://127.0.0.1:8080`, a 390 × 844 Chrome viewport, disabled browser cache, and five cold page loads. Transfer sizes include response headers. These are local-loopback measurements, not public-host latency.

| Route | HTTP | Requests | Transferred bytes | Median load |
| --- | ---: | ---: | ---: | ---: |
| `/` | 200 | 4 | 11,746 | 36 ms |
| `/bin/windows/` | 200 | 3 | 8,701 | 36 ms |
| `/bin/macosx/` | 200 | 3 | 8,702 | 33 ms |
| `/bin/linux/` | 200 | 3 | 8,705 | 40 ms |
| `/web/packages/` | 200 | 4 | 10,701 | 73 ms |
| `/web/packages/termr/index.html` | 200 | 3 | 8,904 | 61 ms |
| `/manuals.html` | 200 | 3 | 9,877 | 51 ms |

The search index is requested only after a query is submitted. Search JSON is served with gzip and a short cache lifetime. Initial home-page First Contentful Paint measured 140 ms in the earlier browser run.

## Package-name search: before and after

Both search runs used the same Chrome/Nginx setup at 390 × 844, with cache disabled and three cold runs per query. Timings start on Enter and stop when the result list appears. The byte column is the compressed response body from browser Resource Timing; it excludes HTTP headers.

Before this change, the generated search data had **36 full-text token shards** and **26 package metadata shards**: 24,867,179 raw bytes total and 8,453,982 bytes with gzip level 9. The `plot` query loaded nine requests; exact package-name queries used one metadata shard.

The current build has one `assets/package-search.json` with 25,579 `[name, title]` entries and no full-text index or shards. It is 1,675,850 bytes raw and 566,096 bytes with gzip level 9 (about 93.3% smaller than the previous complete search data). Nginx transferred 580,596 compressed body bytes for the index. It is fetched once on the first search and reused for subsequent queries on that page.

| Query | Before: requests / bytes / median | After: requests / bytes / median | Results after |
| --- | ---: | ---: | ---: |
| `termr` | 1 / 71,830 B / 35 ms | 1 / 580,596 B / 105.9 ms | 1 |
| `ggplot2` | 1 / 80,057 B / 43.6 ms | 1 / 580,596 B / 107.5 ms | 4 |
| `plot` | 9 / 1,231,457 B / 206.3 ms | 1 / 580,596 B / 105.7 ms | 20 |
| `GGPLOT2` | 1 / 80,057 B / 32.6 ms | 1 / 580,596 B / 103.8 ms | 4 |

The compact single index cuts the `plot` query from nine requests and 1.23 MB to one request and 581 KB, and exact, prefix, and substring results now share the same deterministic ranking. Exact lookups transfer more bytes than before because they now fetch the whole name-and-title index; the larger first-query cost is the tradeoff for removing dozens of shards and the old full-text search path. No index bytes are sent until the user searches.

The browser verified that `termr` and `ggplot2` rank first for their exact and case-insensitive queries. For `plot`, prefix results precede any interior substring matches. The result cards show package names and titles; the test suite verifies that searching a title word alone returns no result.

## No-JavaScript catalog

The alphabetic package catalog remains regular generated HTML. With JavaScript disabled, users can follow the 26 letter links and open package pages; only the optional search enhancement is unavailable. The search form and no-script hint make this explicit.

## Automated checks

- `npm test`: 14 offline parser, index, ranking, validation, fallback, and rendering tests.
- `npm run check:site`: all 25,651 generated HTML pages and internal local `href`/`src` paths; verifies the compact index has one name/title pair per package and no old shard directories.
- `python scripts/check_html.py dist`: 54 representative pages across templates and catalog letters.
- `node --check public/search.js` and `node --check scripts/benchmark.mjs`: JavaScript syntax checks.
- Lighthouse scores are not included. For a public demo, compare this build and original CRAN using the same Lighthouse version and throttling profile.
