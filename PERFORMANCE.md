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

- `npm test`: currently 21 offline parser, index, ranking, validation, fallback, rendering and reverse-dependency regression tests (historical measurements above precede this addition).
- `npm run check:site`: all 25,651 generated HTML pages and internal local `href`/`src` paths; verifies the compact index has one name/title pair per package and no old shard directories.
- `python scripts/check_html.py dist`: 54 representative pages across templates and catalog letters.
- `node --check public/search.js` and `node --check scripts/benchmark.mjs`: JavaScript syntax checks.
- Lighthouse scores are not included. For a public demo, compare this build and original CRAN using the same Lighthouse version and throttling profile.

## Reverse dependencies implementation — 2026-10-29

Reverse metadata now comes from the same official `packages.rds` as each main
package record. All five source columns are mandatory. Known NA cells are
exported as explicit empty DCF fields; missing columns/fields, malformed names
or within-category duplicates fail the build. Category overlaps remain intact.
There is no new fetch, API, JavaScript or JSON index for reverse dependencies.

Main package pages show five counts and links only for nonzero categories.
Complete lists live at `/web/packages/<name>/reverse-dependencies.html` only when
at least one category is nonempty. Empty categories have permanent sections on
that page. Names outside the current CRAN snapshot are plain text, with no guessed
CRAN/Bioconductor/GitHub targets. New CSS uses only reverse-specific classes and
retains the shared 12 px technical labels and 15 px list text.

Raw measurements, retained input RDS/DCF and screenshots:
[audits/reverse-dependencies/2026-10-29/](audits/reverse-dependencies/2026-10-29/).
Earlier page timings in this document belong to their original builds; they are
not measurements of the new reverse pages or evidence of a speed improvement.

### Prototype gate

Before full generation, all five representative lists were compared by exact
name set with the saved official HTML and its RDS. Counts alone were insufficient.
All 25584 records in that saved snapshot passed strict name/separator validation;
the real representation is comma-separated names, with DCF line wrapping removed
only around tokens. Empty/missing, malformed, duplicate and large fixtures are
covered by tests. No R expression is evaluated.

| Saved-snapshot prototype | Main before / after B | Reverse HTML B | Main / reverse anchor elements |
|---|---:|---:|---:|
| ggplot2 | 8859 / 9709 | 531154 | 68 / 7199 |
| data.table | 8809 / 9669 | 151158 | 36 / 1964 |
| Rcpp | 7524 / 8365 | 470750 | 33 / 6803 |
| termr | 6206 / 6819 | no file | 26 / 0 |
| MASS | 5237 / 6074 | 205367 | 25 / 2995 |

Prototype parse/validation of the full DCF took **493.7 ms**. Rendering/writing
the five examples, gzip estimates and prototype summary took **69.2 ms**; this
excludes RDS export and does not extrapolate thousands of filesystem writes.
Twenty responsive no-JavaScript scenarios passed before the full build. Main
HTML contains counts, not dependent names, hidden lists or inline JSON. Its
growth is **613–860 B** in these examples.

### Full release: one fresh snapshot

The full build retained a new official RDS with SHA-256
`8252204f1c940e4fa6e70b7c3e77598b99e9a580c552f8a981b679179ff9bc37`.
Its **25585 current packages** produced **7949 reverse pages**, **243449 category
relationships**, and **25680 relationships to names outside this snapshot**.
Those external relationships remain visible as text. Counts and filenames are
computed on each build, not fixed to the earlier 7951-page estimate.

| Current snapshot | Depends | Imports | LinkingTo | Suggests | Enhances | Main / reverse HTML B |
|---|---:|---:|---:|---:|---:|---:|
| ggplot2 | 480 | 5398 | 0 | 2355 | 8 | 9709 / 531223 |
| data.table | 74 | 1939 | 0 | 301 | 6 | 9669 / 151087 |
| Rcpp | 172 | 3445 | 3674 | 56 | 0 | 8365 / 470750 |
| termr | 0 | 0 | 0 | 0 | 0 | 6819 / no file |
| MASS | 325 | 2022 | 0 | 843 | 2 | 6074 / 205296 |
| testthat (largest) | 13 | 98 | 42 | 14275 | 1 | 7783 / 931086 |

The prototype and release snapshots differ. The changed counts above are upstream
data changes; no category is silently inferred from a different snapshot. An
independent R script reads the retained RDS and exports expectations, then compares
**every main count and every full list** with the generated HTML. All passed.

| Cost | Bytes |
|---|---:|
| Additional reverse HTML | 37963786 |
| Main-page count sections | 16171556 |
| Feature HTML total | 54135342 (~51.6 MiB) |
| Sum of gzip estimates for reverse HTML | 10353314 |
| Incremental main-page gzip from adding count sections | 3959056 |
| Combined feature gzip estimate | 14312370 (~13.6 MiB) |

Gzip uses Node's default per-file gzip, not an observed HTTP transfer. Main-page
gzip overhead is measured against the **same generated document with only the
count section removed**, avoiding data-version confounding. This does not imply
all reverse pages are transferred in a user session: they load only after explicit
navigation. Ordinary package loads requested no reverse HTML or JSON in browser QA.

| Complete `dist` | Before | After |
|---|---:|---:|
| HTML files | 25657 | 33606 |
| All files | 25662 | 33611 |
| Logical bytes | 164377749 | 218540292 |
| File data-stream allocation | 227820080 | 283091504 |

Actual file allocation grew **55271424 B (~52.7 MiB)**. It was read on Windows
using `GetFileInformationByHandleEx` / `FILE_STANDARD_INFO.AllocationSize`, not
estimated by rounding lengths. It excludes directory/MFT metadata and whole-volume
overhead; see [Microsoft's definition](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info).
Logical growth differs slightly from feature-only bytes because of shared CSS and
fresh input data. Raw audit copies are outside `dist` and not published.

Full `npm run build`: **248.5 s**, including the ordinary network acquisition,
R import/export and optional snapshot capture. From `Generating static HTML...`
through publication/cleanup: **62.1 s**. Complete `npm run check:site`: **62.3 s**.
The preceding parity build generated/published in 24.3 s; the extra ~37.8 s is
within the earlier 8–80 s file-I/O sensitivity estimate, not an isolated CPU
benchmark. Total wall times include live network and cannot attribute all changes
to reverse rendering. Output remained within the reviewed 46.6–64.1 MiB feature
estimate. During this measured run a cap of 192 MiB was enforced before publication;
the normal build does not impose that cap or a fixed page count.

The atomic staging directory includes both main and reverse pages. Regression
tests verify preservation of the prior release on missing metadata and on a
post-generation budget failure. Required commands passed: **21/21 Node tests**, R
export regression, full build and full site check. The checker covers all 33606
HTML files, reverse counts/anchors/list lengths, duplicate names, local links and
plain-text treatment of names outside the snapshot.

Final browser QA passed **24 scenarios**: six packages including largest-list
`testthat`, at 320/390/768/1440 px, with JavaScript disabled. Counts, complete lists,
navigation anchors, return links, empty-page absence, keyboard focus and horizontal
overflow were checked. Mobile/desktop summary and largest-page screenshots were
visually inspected. Existing Unicode/Authors@R regressions passed; search code and
the `[Package, Title]` format are unchanged. No new Lighthouse score is claimed;
the isolated static request graph and byte measurements answer this change's
initial-load question without another multi-hundred-audit run.
