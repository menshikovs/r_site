# Performance and release checks

## Reproduce measurements

Build the site and serve `dist/` with a static web server. The HTTP benchmark uses Node's built-in `fetch` and needs no extra package:

```powershell
npm run build
node scripts/benchmark.mjs --baseline https://cran.r-project.org --candidate http://127.0.0.1:8080 --runs 5
```

The script reports request counts, response bytes after HTTP decompression, median TTFB/response time, and candidate search index costs. For browser rendering, disable cache in Chrome DevTools and record request count, transferred bytes, DOM Content Loaded, First Contentful Paint, and load event. Run the same routes and queries with the same viewport and network profile; report medians. Lighthouse is optional and is not a project dependency.

## CRAN data-source diagnosis

On the build host, `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` point to `http://127.0.0.1:9`, where no proxy service is available. R 4.5.2 libcurl cannot connect through that proxy; with the proxy variables cleared, its direct TLS connection also fails in this environment. Windows `curl.exe` fails through the configured proxy. Node's built-in `fetch` can reach CRAN directly. The official `cloud.r-project.org` 0-Cloud mirror served the complete package RDS and R decoded it into 25,554 records; at that moment the canonical CRAN source had 25,556 records, so the mirror was two packages behind. The official `cran.csiro.au` mirror returned HTTP 200 to HEAD, but its full package RDS GET timed out here. Both mirrors are listed by CRAN. The build now uses Node fetch with retries and fallback to HTTPS mirrors parsed from the official directory; R only decodes the downloaded local RDS. Package-count, mirror-count, installer, and source-page validation remain enabled.

The refreshed build completed on 2026-10-28 with 25,576 packages and 81 mirrors. The generated output has 25,714 files, including 25,648 HTML routes. A fetch failure still stops the build before it stages or replaces `dist`.

## WSL Nginx browser measurements

Measurements below were made on Ubuntu WSL Nginx at `http://127.0.0.1:8080`, with Chrome at 390 × 844, browser cache disabled, and five cold page loads. Transfer sizes include response headers. Times are local-loopback measurements, not public-host latency.

| Route | HTTP | Requests | Transferred bytes | Median load |
| --- | ---: | ---: | ---: | ---: |
| `/` | 200 | 4 | 11,746 | 36 ms |
| `/bin/windows/` | 200 | 3 | 8,701 | 36 ms |
| `/bin/macosx/` | 200 | 3 | 8,702 | 33 ms |
| `/bin/linux/` | 200 | 3 | 8,705 | 40 ms |
| `/web/packages/` | 200 | 4 | 10,701 | 73 ms |
| `/web/packages/termr/index.html` | 200 | 3 | 8,904 | 61 ms |
| `/manuals.html` | 200 | 3 | 9,877 | 51 ms |

The initial home-page navigation measured First Contentful Paint at 140 ms. It downloads no search JSON before a query. HTML, CSS, SVG, JavaScript, and search JSON responses had `Content-Encoding: gzip`. HTML and search data used `Cache-Control: public, max-age=300, must-revalidate`.

### Historical search benchmark before the final visual refinement

The same Chrome/Nginx environment and queries were measured before and after adding the small exact-name shards. Package data refreshed between runs, so the two-result-set sizes differ slightly.

| Query | Before: requests / compressed body / median | After: requests / compressed body / median | Results |
| --- | --- | --- | ---: |
| `termr` | 2 / 543,238 B / 116 ms | 1 / 34,931 B / 80 ms | 1 |
| `reactive terminal` | 13 / 1,168,236 B / 189 ms | 13 / 1,168,425 B / 281 ms | 20 |

For exact `termr`, the uncompressed response body fell from 1,589,817 B to the 98,119 B name shard, about a 94% reduction. The compressed body fell by about 94%, and one request was removed. The description query still returns the same 20 package results; it continues to request two term shards plus title shards for the result initials. Its transfer volume did not materially change. Its timing varied between runs and did not improve in this sample, so description-search performance remains an optimization opportunity.

The dependency-free benchmark measured the current `reactive terminal` response at 3,331,776 B before compression; the prior snapshot measured 3,331,226 B. The 550 B difference reflects the two newly indexed packages in the refreshed CRAN data.

### Final visual refinement measurements

The final 2026-10-28 build includes 25,576 package pages. Search metadata now stores an 80-character description excerpt alongside each package name and title. The exact `termr` query loads one metadata shard (71,830 compressed response bytes). The `reactive terminal` query returns the same 20 results with 12 requests and 1,592,182 compressed response bytes; the earlier title-only search used 13 requests and 1,168,425 bytes. The transfer grows because each result now includes a short description.

The combined compressed search index changed from 8,430,754 B to 8,453,620 B (+0.27%). This includes 36 full-text shards and 26 package metadata shards; the 80-character excerpts keep the additional index size small.

Homepage assets, measured with gzip level 9, changed as follows:

| Asset | Before: raw / gzip | Final: raw / gzip |
| --- | ---: | ---: |
| Homepage HTML | 9,781 / 3,287 B | 10,212 / 3,440 B |
| Site CSS | 23,964 / 5,125 B | 27,130 / 5,639 B |

The package category and badge labels are 11 px after refinement and have 5.35:1 and 5.62:1 contrast against the page background. Browser checks found no horizontal overflow at 320, 390, 768, or 1440 px. Keyboard focus is visible on search results. With JavaScript disabled, all 26 alphabet links and the 1,125 static links on the A catalog page remain available; no search scripts or index shards are requested.

For no-JavaScript verification, create a fresh browser context with JavaScript disabled and check `/` and `/web/packages/`. The home page must retain its catalog link and no-script guidance; the catalog must expose package pages and the 26 alphabet links.

## Automated checks

- `npm test`: 13 offline parser, validation, fallback, and render tests.
- `npm run check:site`: all 25,648 generated HTML routes and internal local `href`/`src` paths.
- `python scripts/check_html.py dist`: representative templates and routes.
- `Rscript tests/export-cran-data.R`: local official-RDS exporter fixture.
- Lighthouse scores are not included. Run Lighthouse on both the demo and original CRAN from a machine with Lighthouse/Chrome available, using the same version and throttling profile; keep the raw reports with the demo record.
