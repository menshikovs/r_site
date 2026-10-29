# CRAN: Performance Investigation and Optimization Validation

Date: **2026-10-29, Europe/Riga**. Local laboratory experiment, not an assessment of public CRAN infrastructure.

## Result

File location had a substantial confirmed effect: serving the same limited corpus from native ext4 instead of the Windows `/mnt/c` mount eliminated observed timeouts in three bounded intervals at 50 clients. HTTP configuration, gzip, keep-alive, and worker count remained unchanged. tmpfs was tested separately and was not presented as ext4.

The evidence supports recommending a published build copy on a native Linux filesystem in [deploy/README.md](deploy/README.md). Working Nginx on 8080 was unchanged. CSS, HTML templates, text sizes, navigation, and the `[Package, Title]` index were retained. Measurements do not justify promising a sustained frontend speedup from a cosmetic CSS change.

All new results are in [benchmarks/results/2026-10-29-optimization/](benchmarks/results/2026-10-29-optimization/). Previous audit data is retained.

## 1. Inputs and environment

Before new tests, reviewed [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md), [PERFORMANCE.md](PERFORMANCE.md), original browser JSONL, Lighthouse JSON, and `load.json` from 2026-10-28. The earlier load test used a custom Node HTTP client, **not k6**. Its 70 timeouts at 50 clients cannot be described as a k6 baseline.

Existing installed tools found:

- Lighthouse **13.6.0**: `node benchmarks/tooling/node_modules/lighthouse/cli/index.js --version`. No global command in PATH.
- Windows k6 **2.3.0**, Go 1.26.8: `C:\Program Files\k6\k6.exe version`. Ubuntu has no `k6` command. Nothing was installed.
- Chrome **156.0.8078.48**, Windows Node **26.11.1**, Playwright **1.64.1**.
- Ubuntu WSL2, Nginx **1.28.3**; server parameters and limits recorded in [environment-wsl.txt](benchmarks/results/2026-10-29-optimization/environment-wsl.txt).

Started the earlier separate comparison Nginx on 8081/8082. Created a separate instance on 8083/8084 for Linux copies. Both use one worker, 1024 worker connections, `sendfile on`, keep-alive 65 s, gzip level 5, ETag, and identical Cache-Control. The worker's soft file limit is 10240, well above tested concurrency. Access logs are disabled in both instances. Configurations and headers are retained with the results.

Windows k6 and Linux Nginx run in separate processes and operating systems on the same physical computer. This establishes that reproducing the problem does not require the client to run in the same WSL instance, but does **not** isolate physical CPU, memory, or virtual networking. Independent capacity assessment needs a separate generator on another computer.

## 2. Browser main-thread investigation

Saved five complete Chrome Performance traces: `trace-{home,windows,catalog,ggplot2,manuals}.json`, plus [DOM, grids, fonts, and CSS usage](benchmarks/results/2026-10-29-optimization/investigation.json). These can be opened in Chrome DevTools Performance. Traces are diagnostic, with extra invalidation-tracking categories; their timings are not mixed with ordinary page-load measurements.

| Page | DOM elements | Objects in primary Layout | Primary Layout in diagnostic mobile trace, ms |
|---|---:|---:|---:|
| Home | 238 | 378 | 285.1 |
| Windows | 110 | 172 | 162.9 |
| Catalog | 175 | 276 | 168.7 |
| ggplot2 | 109 | 176 | 187.6 |
| Manuals | 191 | 366 | 132.5 |

Layout object counts differ from DOM element counts: text and internal layout objects are included. Each trace is dominated by **one initial full Layout rooted at `#document`**, with all objects marked dirty. Other small Layout events in these traces take less than 0.4 ms each. No evidence of a chain of major repeated recalculations triggered by search or JavaScript was found. These traces cannot attribute all cost to one CSS selector or card.

The homepage has the most nested grids: `.download-grid` / `.download-card`, `.why-grid`, `.starter-path` and its items, `.environment-options`, `.resource-grid`, `.contribute`. In the catalog, `.alphabet` lays out 26 links with nested grid items. Navigation uses flex on mobile and grid on desktop; media rules hide some mobile elements. These add layout structures, but grids alone do not establish the cause of high cost. Separate diagnostic controls disabled grids, changed text rendering, and replaced the mono font to investigate causes; these intentionally alter presentation and are not site changes.

Controls did not confirm a universal grid bottleneck: disabling grids did not even reduce median Layout on home or Windows. In the catalog, substituting Arial for the mono stack reduced diagnostic median Layout from about 140 to 111 ms but changes typography; other pages showed no equivalent effect. `text-rendering:auto` also produced no consistent benefit across three pages. Five diagnostic repetitions do not establish a small sustained effect. Consequently, grid removal, font substitution, and text-rendering changes were not applied to source.

CSS usage was collected separately per page. A rule unused on one page is not necessarily removable: shared CSS serves package pages, platforms, catalog, manuals, search, responsive states, hover/focus, and reduced motion. The latest shared type scale overrides some old `font-size` values but does not make entire rules unnecessary. No small CSS removal was made without demonstrated benefit.

The only external render-blocking resource is the shared local `/assets/site.css` (28854 B uncompressed). Selected pages have no external CSS imports, web fonts, or third-party requests. They use Arial/Helvetica and a system mono stack with Consolas. No font download does not mean zero font selection, shaping, or text measurement cost. Switching fonts for speed would violate the requirement to retain the visual design.

`search.js` is a small module present only on home and catalog pages. On initial load it attaches a submit handler; the index loads after a user query. It has no loop alternating layout reads and DOM geometry writes. Current index, ranking, and name/title format were unchanged.

## 3. Repeated browser measurements and Lighthouse

Browser series retained the previous settings: desktop 1440×900, 20 ms latency, 50 Mbit/s, CPU 1×; mobile 390×844, 40 ms, 10 Mbit/s, CPU 4×, DPR 1. Each page/site/profile/cache combination has 10 repetitions with alternating site order: 400 observations. Cold uses a fresh context; warm first opens the same page, then `about:blank`, and navigates again. HTTP cache is enabled and filesystem cache prewarmed. Collection ends 500 ms after load. All measurement workloads run sequentially.

Measured redesign input files match the previous audit archive by SHA-256: [input-integrity.json](benchmarks/results/2026-10-29-optimization/input-integrity.json). Date-to-date comparison therefore **repeats measurements of an unchanged frontend**; it is not an experiment establishing a CSS change's effect. Local LCP values of hundreds of milliseconds cannot be extrapolated to actual phones or WAN conditions.

Numerical browser and Lighthouse tables follow. Raw data: [browser.jsonl](benchmarks/results/2026-10-29-optimization/browser.jsonl), [browser environment](benchmarks/results/2026-10-29-optimization/browser-environment.json), [Lighthouse reports](benchmarks/results/2026-10-29-optimization/lighthouse-current/).

Top-level LCP is unavailable for the original frameset homepage. It remains unavailable, is not replaced with the banner frame's LCP, and is not converted into a zero Lighthouse score. The previous audit directory retains 200 Lighthouse reports.

### Repeated browser series: previous date / current date

Each cell is a median of n=10. Units are ms except CLS. Summary JSON also retains p95 and valid counts. These tables do not establish a frontend-change effect: input bytes are identical.

| Profile / cache / page | FCP previous / current | LCP previous / current | DCL previous / current | Current CLS |
|---|---:|---:|---:|---:|
| desktop/cold/home | 146.0 / 158.0 | 146.0 / 158.0 | 134.4 / 140.9 | 0 |
| desktop/cold/windows | 126.0 / 140.0 | 126.0 / 140.0 | 46.9 / 44.8 | 0 |
| desktop/cold/catalog | 130.0 / 126.0 | 130.0 / 126.0 | 117.8 / 115.2 | 0 |
| desktop/cold/ggplot2 | 132.0 / 126.0 | 132.0 / 126.0 | 46.5 / 48.0 | 0 |
| desktop/cold/manuals | 134.0 / 130.0 | 134.0 / 130.0 | 44.7 / 44.8 | 0 |
| desktop/warm/home | 24.0 / 24.0 | 24.0 / 24.0 | 7.5 / 7.3 | 0 |
| desktop/warm/windows | 22.0 / 20.0 | 22.0 / 20.0 | 6.9 / 6.4 | 0 |
| desktop/warm/catalog | 24.0 / 20.0 | 24.0 / 20.0 | 7.8 / 7.3 | 0 |
| desktop/warm/ggplot2 | 24.0 / 18.0 | 24.0 / 18.0 | 6.7 / 6.8 | 0 |
| desktop/warm/manuals | 22.0 / 20.0 | 22.0 / 20.0 | 7.3 / 6.9 | 0 |
| mobile/cold/home | 482.0 / 438.0 | 482.0 / 438.0 | 471.3 / 429.4 | 0 |
| mobile/cold/windows | 340.0 / 326.0 | 340.0 / 326.0 | 96.8 / 97.4 | 0 |
| mobile/cold/catalog | 312.0 / 330.0 | 312.0 / 330.0 | 304.8 / 323.7 | 0 |
| mobile/cold/ggplot2 | 354.0 / 362.0 | 354.0 / 362.0 | 88.6 / 100.1 | 0 |
| mobile/cold/manuals | 340.0 / 344.0 | 340.0 / 344.0 | 97.4 / 96.8 | 0 |
| mobile/warm/home | 66.0 / 64.0 | 66.0 / 64.0 | 31.8 / 32.5 | 0 |
| mobile/warm/windows | 48.0 / 52.0 | 48.0 / 52.0 | 27.6 / 27.9 | 0 |
| mobile/warm/catalog | 60.0 / 60.0 | 60.0 / 60.0 | 31.1 / 32.1 | 0 |
| mobile/warm/ggplot2 | 56.0 / 50.0 | 56.0 / 50.0 | 28.4 / 27.2 | 0 |
| mobile/warm/manuals | 56.0 / 52.0 | 56.0 / 52.0 | 29.5 / 27.4 | 0 |

| Profile / cache / page | Layout previous / current, ms | Style previous / current, ms | Current transferred B | Current requests |
|---|---:|---:|---:|---:|
| desktop/cold/home | 46.5 / 49.6 | 4.1 / 4.4 | 13444 | 5 |
| desktop/cold/windows | 29.6 / 32.2 | 0.8 / 0.8 | 10003 | 4 |
| desktop/cold/catalog | 26.7 / 26.4 | 3.7 / 3.8 | 11617 | 5 |
| desktop/cold/ggplot2 | 29.9 / 29.6 | 0.7 / 0.8 | 10773 | 4 |
| desktop/cold/manuals | 32.1 / 32.2 | 0.9 / 0.9 | 11167 | 4 |
| desktop/warm/home | 1.5 / 1.6 | 0.9 / 0.8 | 0 | 5 |
| desktop/warm/windows | 0.7 / 0.6 | 0.5 / 0.5 | 0 | 4 |
| desktop/warm/catalog | 1.1 / 1.2 | 0.5 / 0.5 | 0 | 5 |
| desktop/warm/ggplot2 | 0.8 / 0.7 | 0.5 / 0.4 | 0 | 4 |
| desktop/warm/manuals | 0.8 / 0.8 | 0.6 / 0.5 | 0 | 4 |
| mobile/cold/home | 267.5 / 228.6 | 22.3 / 19.2 | 13444 | 5 |
| mobile/cold/windows | 153.1 / 141.2 | 5.1 / 4.4 | 10003 | 4 |
| mobile/cold/catalog | 128.9 / 118.4 | 16.8 / 16.2 | 11617 | 5 |
| mobile/cold/ggplot2 | 154.0 / 144.8 | 3.8 / 4.1 | 10773 | 4 |
| mobile/cold/manuals | 133.3 / 139.0 | 5.2 / 4.7 | 11167 | 4 |
| mobile/warm/home | 6.3 / 6.9 | 4.5 / 4.8 | 0 | 5 |
| mobile/warm/windows | 3.0 / 2.7 | 2.0 / 2.4 | 0 | 4 |
| mobile/warm/catalog | 4.0 / 4.4 | 2.4 / 2.5 | 0 | 5 |
| mobile/warm/ggplot2 | 4.4 / 3.8 | 2.8 / 2.3 | 0 | 4 |
| mobile/warm/manuals | 4.1 / 4.0 | 2.9 / 2.4 | 0 | 4 |

Requests are logical browser requests, including cache hits. All warm page trials have zero transfer; that does not mean zero logical requests. Negative/nonnumeric CPU deltas are excluded only from the corresponding counter summary; original rows are retained. Original pages were also remeasured; their 200 observations appear in the shared JSONL and summary.

### Diagnostic CSS controls

Medians of five mobile cold contexts per control. CSS interception is identical across controls, so their network FCP/LCP is not compared with the main series. `noGrid` breaks layout; `singleFont` replaces technical mono text with Arial. These attribute cost and are not acceptable frontend optimizations.

| Page / control | Layout, ms | Style, ms |
|---|---:|---:|
| home/control | 221.3 | 21.4 |
| home/noGrid | 235.2 | 20.9 |
| home/automaticText | 230.0 | 21.6 |
| home/singleFont | 218.8 | 21.6 |
| windows/control | 145.3 | 4.2 |
| windows/noGrid | 153.1 | 4.6 |
| windows/automaticText | 151.6 | 4.2 |
| windows/singleFont | 158.4 | 5.1 |
| catalog/control | 140.2 | 20.0 |
| catalog/noGrid | 127.7 | 18.6 |
| catalog/automaticText | 131.3 | 19.5 |
| catalog/singleFont | 111.0 | 18.5 |

### Repeated Lighthouse audits

Ran one additional audit per page/profile/cache combination (20 audits), with a separate Chrome process per audit. This is a diagnostic repeat; the desired 10 repetitions were completed in the main browser series, **not** this Lighthouse series. A single score cannot establish sustained improvement. Previous redesign cold Lighthouse scores had median 100 in all 10 page/profile groups. The new warm audit first opens the page in the same process and preserves storage/cache; cold clears storage normally. Each LHR retains settings and network records; warm here concerns the main navigation pass's cache state, while the accessibility pass may load separately.

| Profile / page / cache | Performance | Accessibility | FCP / LCP, ms | CLS |
|---|---:|---:|---:|---:|
| desktop/home/cold | 100 | 100 | 210.9 / 210.9 | 0 |
| desktop/home/warm | 100 | 100 | 75.5 / 75.5 | 0 |
| desktop/windows/cold | 100 | 100 | 150.4 / 150.4 | 0 |
| desktop/windows/warm | 100 | 100 | 55.4 / 55.4 | 0 |
| desktop/catalog/cold | 100 | 100 | 144.0 / 144.0 | 0 |
| desktop/catalog/warm | 100 | 100 | 46.9 / 46.9 | 0 |
| desktop/ggplot2/cold | 100 | 100 | 150.1 / 150.1 | 0 |
| desktop/ggplot2/warm | 100 | 100 | 55.6 / 55.6 | 0 |
| desktop/manuals/cold | 100 | 100 | 147.0 / 147.0 | 0 |
| desktop/manuals/warm | 100 | 100 | 61.5 / 61.5 | 0 |
| mobile/home/cold | 100 | 100 | 498.5 / 498.5 | 0 |
| mobile/home/warm | 100 | 100 | 349.1 / 349.1 | 0 |
| mobile/windows/cold | 100 | 100 | 346.9 / 346.9 | 0 |
| mobile/windows/warm | 100 | 100 | 218.8 / 218.8 | 0 |
| mobile/catalog/cold | 100 | 100 | 670.3 / 670.3 | 0 |
| mobile/catalog/warm | 100 | 100 | 197.1 / 197.1 | 0 |
| mobile/ggplot2/cold | 100 | 100 | 376.4 / 376.4 | 0 |
| mobile/ggplot2/warm | 100 | 100 | 236.3 / 236.3 | 0 |
| mobile/manuals/cold | 100 | 100 | 313.7 / 313.7 | 0 |
| mobile/manuals/warm | 100 | 100 | 185.5 / 185.5 | 0 |

Errors and warnings are not hidden: see [Lighthouse summary](benchmarks/results/2026-10-29-optimization/lighthouse-current-summary.json). Contrast checking is limited to Lighthouse/axe coverage.

## 4. Load experiment: methodology

Only loopback URLs on dedicated ports were tested. The k6 scenario rejects external addresses and concurrency above 50. No public CRAN or mirror load tests were performed.

Three 5-second intervals at 1/10/25/50 VU per version and filesystem. Each VU makes one request at a time; keep-alive enabled, `Accept-Encoding: gzip`, request timeout 5 s, redirects disabled. Requests cycle through `/`, `/bin/windows/`, `/web/packages/`, `/web/packages/ggplot2/index.html`, `/manuals.html`. These paths are prewarmed before each interval. No browser cache. The two versions differ substantially in corpus size/content, particularly ggplot2; their RPS does not compare equivalent functionality.

For `/mnt/c`, used working `dist/` and the saved original copy. tmpfs and ext4 received the same saved limited corpora: 16 original files and 10 candidate files. The entire catalog of 25 thousand package pages was not copied because the load accesses only five selected pages. This tests a fixed small working set, not traversal of all CRAN.

`df -T` confirmed `/mnt/c` as 9p/DrvFS; `/tmp/cran-optimization-20261029` as tmpfs; `/var/tmp/cran-optimization-20261029` as **ext4 on /dev/sdd**. DrvFS/tmpfs ran first, then only roots were changed to ext4 in the extra Nginx instance and the native series repeated. [tmpfs configuration](benchmarks/results/2026-10-29-optimization/nginx-native.conf), [ext4 configuration](benchmarks/results/2026-10-29-optimization/nginx-ext4.conf), [filesystem and hashes](benchmarks/results/2026-10-29-optimization/ext4-filesystem.txt).

Nginx CPU and memory were sampled from `/proc` every 100 ms; Windows k6 CPU and working set were sampled at the same interval. CPU 100% means one logical core. Nginx RSS sums master and worker and may double-count shared pages. Windows working set and Linux RSS are not identical. CPU is estimated over k6's lifetime including startup/teardown, not an exactly isolated five seconds. Raw time series are retained in `monitor-*.jsonl` and `load-resource-windows.json`, including the separate `ext4/` directory.

In the first series, k6 warned about unsupported top-level `gracefulStop`: it was ignored, and the default graceful stop applied. This neither hid request errors nor changed the active 5 s/timeout 5 s. The scenario used is saved as `k6-script-used.js`; the ineffective option was removed before the ext4 series. Statistics include requests completing after the active window. RPS uses actual k6 duration, including drain.

## 5. k6 results

Figures below are medians of three intervals. p50/p95/p99 are **medians of three individual interval quantiles**, not pooled request percentiles. Latency is k6 `http_req_duration`, including failed attempts; it excludes initial connection time. Additional `attempt_elapsed` retains complete call duration. The table is therefore not mixed with the former Node client's successful-only quantiles. HTTP errors mean non-200 responses; timeouts and transport errors are counted separately. All new series had transport errors equal to timeouts.

| Filesystem / version / clients | Successful responses/s | p50 / p95 / p99, ms | HTTP errors / timeouts, total | Nginx CPU % / peak RSS MiB | k6 CPU % / peak working set MiB |
|---|---:|---:|---:|---:|---:|
| DrvFS/original/1 | 112.9 | 8.21 / 15.92 / 18.83 | 0 / 0 | 14.2 / 6.8 | 4.7 / 36.0 |
| DrvFS/redesign/1 | 177.2 | 4.94 / 10.28 / 15.36 | 0 / 0 | 7.4 / 6.8 | 9.3 / 36.0 |
| tmpfs/original/1 | 807.7 | 0.50 / 4.85 / 5.95 | 0 / 0 | 70.8 / 6.9 | 20.1 / 37.4 |
| tmpfs/redesign/1 | 2650.1 | 0.51 / 0.78 / 1.02 | 0 / 0 | 37.1 / 6.9 | 46.1 / 40.7 |
| DrvFS/original/10 | 120.6 | 79.41 / 125.88 / 151.68 | 0 / 0 | 15.3 / 6.8 | 5.8 / 38.3 |
| DrvFS/redesign/10 | 209.7 | 43.21 / 74.55 / 99.09 | 0 / 0 | 8.2 / 6.8 | 8.0 / 39.8 |
| tmpfs/original/10 | 1101.7 | 8.84 / 17.16 / 21.05 | 0 / 0 | 92.5 / 6.9 | 22.3 / 41.8 |
| tmpfs/redesign/10 | 7605.4 | 1.07 / 1.66 / 2.16 | 0 / 0 | 92.4 / 6.9 | 133.0 / 53.0 |
| DrvFS/original/25 | 133.8 | 168.34 / 257.36 / 1187.87 | 0 / 0 | 17.6 / 6.8 | 4.6 / 43.4 |
| DrvFS/redesign/25 | 237.2 | 98.94 / 129.29 / 329.28 | 0 / 0 | 9.4 / 6.8 | 10.3 / 43.7 |
| tmpfs/original/25 | 1115.3 | 22.05 / 33.49 / 37.21 | 0 / 0 | 92.7 / 6.9 | 20.7 / 48.0 |
| tmpfs/redesign/25 | 7880.0 | 3.12 / 4.04 / 5.08 | 0 / 0 | 92.5 / 6.9 | 129.4 / 58.7 |
| DrvFS/original/50 | 118.1 | 201.61 / 1328.64 / 4999.54 | 0 / 47 | 15.9 / 6.8 | 4.2 / 50.7 |
| DrvFS/redesign/50 | 239.4 | 146.51 / 244.79 / 2931.20 | 0 / 6 | 9.3 / 6.8 | 7.4 / 51.1 |
| tmpfs/original/50 | 1069.6 | 45.15 / 60.98 / 73.11 | 0 / 0 | 93.3 / 6.9 | 22.2 / 56.4 |
| tmpfs/redesign/50 | 7959.7 | 6.22 / 7.30 / 8.49 | 0 / 0 | 90.8 / 6.9 | 132.3 / 67.9 |
| ext4/original/1 | 852.1 | 0.50 / 4.76 / 5.33 | 0 / 0 | 71.5 / 6.9 | 20.5 / 37.4 |
| ext4/redesign/1 | 2651.7 | 0.51 / 0.79 / 1.05 | 0 / 0 | 36.9 / 6.9 | 45.5 / 41.0 |
| ext4/original/10 | 1106.6 | 8.83 / 17.19 / 22.50 | 0 / 0 | 94.2 / 6.9 | 27.6 / 41.5 |
| ext4/redesign/10 | 7962.3 | 1.05 / 1.62 / 2.09 | 0 / 0 | 92.5 / 6.9 | 139.5 / 54.3 |
| ext4/original/25 | 1110.9 | 22.59 / 34.58 / 40.46 | 0 / 0 | 92.9 / 6.9 | 20.8 / 47.2 |
| ext4/redesign/25 | 7625.4 | 3.14 / 4.13 / 4.77 | 0 / 0 | 92.4 / 6.9 | 130.9 / 59.2 |
| ext4/original/50 | 1098.2 | 44.55 / 65.80 / 70.52 | 0 / 0 | 92.0 / 6.9 | 25.1 / 56.3 |
| ext4/redesign/50 | 7114.5 | 6.83 / 8.73 / 10.36 | 0 / 0 | 92.4 / 6.9 | 140.3 / 67.3 |


### What was confirmed at 50 clients

Across three DrvFS intervals: **47 timeouts for original, 6 for redesign**, HTTP 4xx/5xx: 0. On ext4 and tmpfs: **0 timeouts, 0 HTTP errors** at all tested levels. At 50 VU, ext4 median successful RPS was **1098.2 for original and 7114.5 for redesign**, versus **118.1 and 239.4** on DrvFS. This reflects serving the selected corpus on this computer, not a forecast of public CRAN capacity.

On DrvFS, Nginx used about 9–16% of one CPU at 50 VU, versus about 92% on ext4. WSL available memory stayed above 10.15 GiB. There is no evidence of memory exhaustion, worker connection/file limits, or Nginx CPU saturation in the slow DrvFS series. Windows k6 reproduced timeouts without running inside server WSL.

On ext4, the worker approaches one-core saturation; increasing VU adds little RPS. This is the ceiling of this single-worker configuration and corpus. For redesign, Windows k6 used approximately 130–140% CPU under native load, exceeding one core but not all machine cores. Neither this series nor its p99 is an independent server capacity estimate: client, server, and WSL share physical resources. Available evidence does not establish a separate k6 generator bottleneck; server CPU is the clearer native-series limit.

## 6. Timeout cause and remaining uncertainty

A controlled filesystem change with identical bytes, worker count, limits, gzip, and keep-alive produced a large repeatable effect, with tmpfs and ext4 in agreement. **A Windows-mounted document root is a confirmed substantial contributor to the slow local path.** This supports recommending a native filesystem without increasing timeouts or changing the frontend.

This does not establish the exact mechanism of each 5-second outlier. No syscall/eBPF/ETW traces were collected; stat/open/read cost, Windows antivirus, scheduling, and WSL localhost forwarding were not isolated. Native host ports differ from DrvFS host ports, and filesystem series order was not fully randomized. Definitive attribution requires exchanging roots on the same ports and tracing the system during an outlier. No single specific Nginx or k6 defect can be claimed.

Practical next step for production capacity testing: a separate native Linux server, complete immutable site copy, a separate k6 computer, pinned versions/profiles, and CPU/I/O/memory monitoring on both server and client. Do not use public third-party servers for this.

## 7. Changes and tradeoffs

- Added reproducible local diagnostic, k6, monitoring, QA, and summary scripts under `benchmarks/scripts/optimization-*` and `investigate.mjs`.
- Added results and configurations for separate temporary Linux copies. Standard 8080 configuration and global Nginx were not edited.
- Added a measured native ext4 recommendation to the deployment guide. Benefits require separate publication of a `dist/` copy and agreed release switching; editing Windows sources does not automatically update that copy.
- No frontend optimization was applied without sufficient evidence. No runtime dependencies, frontend frameworks, web fonts, or mandatory JavaScript were added. Useful sections, keyboard focus, and enlarged `02 / WHY R`, `03 / GETTING STARTED` were retained.
- Did not enable `open_file_cache`, more workers, or long immutable caching for existing unversioned files: their benefits and freshness effects were not measured here. Small LCP fluctuations were not described as speedups.

## 8. Functional checks

Required command and browser QA results are recorded in the new series directory. Checked canonical paths, Windows/macOS/Linux, manuals and local anchors, search for `termr`, `ggplot2`, `plot`, all 26 letters and no-JS navigation to ggplot2, widths 320/390/768/1440, and visible keyboard focus. Lighthouse also retains accessibility and `color-contrast` audits. Automated auditing does not replace complete manual accessibility review.

All performance measurements preceded the required `npm run build`, using the saved corpus of **25579 packages**. The subsequent full build fetched fresh official data: **25583 packages, 81 mirrors**. This is a data update, not a frontend optimization. The new build does not replace measurement inputs: the earlier limited corpus and its SHA-256 remain in the previous audit archive. Rscript emitted Windows `C.UTF-8` locale warnings, retained in the build log.

Browser QA: **44 records without errors** in [functional-qa.json](benchmarks/results/2026-10-29-optimization/functional-qa.json). Screenshots retained for every page/width. Command results are in `validation-*.txt`; those logs describe build state.

Final required checks passed with exit code 0: `npm test` — **14/14**, `npm run build` — **25583 package pages**, `npm run check:site` — **25655 HTML pages**. The same **44 browser QA checks** were repeated after the data update: [post-build/functional-qa.json](benchmarks/results/2026-10-29-optimization/post-build/functional-qa.json). Both measured snapshot and final build were therefore checked. Representative mobile/desktop screenshots with visible focus outlines were inspected; no horizontal overflow was found on tested routes at four widths. All 20 Lighthouse reports passed `color-contrast`; runtime errors: 0.

Both benchmark Nginx error logs are retained as `nginx-comparison-error.log` and `nginx-native-error.log`. Research instances were stopped after testing; temporary corpora remain for reproduction. Global Nginx and the 8080 configuration were unchanged.

## 9. Future public HTTPS deployment

Publish a complete static release on a native Linux filesystem with atomic switching, retaining canonical URLs and 404s rather than SPA fallback. Keep HTML and the name/title index short-lived until assets are versioned; check ETag/304 and release-to-release updates. Gzip is already enabled; evaluate additional compression, HTTP/2/3, and file caching on the actual HTTPS deployment with the same corpus rather than promising results from loopback.

Once an HTTPS URL is known, measure actual TLS/network costs, FCP/LCP/CLS, and cache behavior with consistent tools. Collect field data separately; these laboratory results are not field Core Web Vitals. Retain the top-level LCP caveat for the original frameset homepage and check page content parity.

The native-storage recommendation also agrees with [Microsoft's official WSL filesystem guidance](https://learn.microsoft.com/en-us/windows/wsl/filesystems). k6 measurement semantics: [metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/) and [options](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/). Nginx file-cache capabilities are described in the [official documentation](https://nginx.org/en/docs/http/ngx_http_core_module.html#open_file_cache), but were not enabled here without separate validation.

No commit or push was performed.
