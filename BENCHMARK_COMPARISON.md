# CRAN Redesign — comparative performance benchmark

Test date: **2026-10-28 (Europe/Riga)**. This is a laboratory comparison of selected static pages, not a measurement of CRAN production capacity. No design, application architecture or generated `dist/` content was changed during measurement.

## Scope and outcome

A public HTTPS URL for the candidate was not supplied or found in repository configuration. GitHub repository metadata had `homepage: null` and `has_pages: false`. **Comparison A (public CRAN versus publicly hosted redesign) was not performed.** Public CRAN download time is not compared with loopback download time. A public deployment elsewhere has not been ruled out; a known URL is needed for that experiment.

Comparison B uses an unmodified limited CRAN snapshot and the existing redesign on two virtual hosts of one Ubuntu WSL Nginx instance. The measurements support page-specific tradeoffs, not a general statement that the redesign is faster. In particular, the ggplot2 pages expose materially different amounts of content.

## Environment and server configuration

- Revision: `b0042bc7050c618393b23bf794624a002c2065e1`. Candidate package count at build time: 25,579; the source snapshot catalog entry reports 25,581. Data snapshots are not exactly simultaneous.
- Computer: LENOVO 83JE; 13th Gen Intel(R) Core(TM) i7-13650HX; 14 physical / 20 logical cores; 23.7 GiB physical RAM.
- Browser: Chrome 156.0.8078.48, headless, extensions disabled, clean contexts; Playwright 1.64.1. Lighthouse 13.6.0. Windows Node v26.11.1.
- Server: nginx/1.28.3 (Ubuntu); WSL2 kernel 6.18.54.1-microsoft-standard-WSL2; WSL memory allocation 11.5 GiB. Browser runs on Windows; load client and Nginx run in the same WSL instance.
- CRAN copy: `http://127.0.0.1:8081`; redesign: `http://127.0.0.1:8082`. The existing port 8080 server was not reconfigured.
- One shared Nginx worker, 1,024 worker connections, sendfile enabled, access log disabled, HTTP/1.1 keep-alive 65 s, ETag enabled. Both roots are on the same Windows-mounted `/mnt/c` filesystem.
- Identical gzip level 5, minimum length 256 B, HTML/CSS/JS/JSON/SVG compression, `Vary: Accept-Encoding`, and `Cache-Control: public, max-age=300, must-revalidate`. No SPA fallback; unknown URLs return 404. These are controlled local policies, not a claim that production CRAN uses the same cache policy.

[Full environment](benchmarks/results/2026-10-28/environment-windows.json), [WSL/Nginx build settings](benchmarks/results/2026-10-28/environment-wsl.txt), [browser configuration](benchmarks/results/2026-10-28/browser-environment.json), [standalone Nginx config](benchmarks/nginx-comparison.conf).

## Inputs and integrity

Snapshot acquisition used 16 sequential bounded GETs and one executable HEAD check, with 250 ms between fetches; all saved resource responses succeeded. 16 source files were saved without rewriting their response bodies. The snapshot includes the three home-page frame documents, styles, icons and package logos. It is a limited test corpus, not a CRAN mirror.

All 25,656 candidate files have the same SHA-256 content manifest before and after the tests: `7625fdce9138781a92581f13dc824a88758d97d21587f73ae3a1b5af886ae110`. Original snapshot hashes also match the fetched bytes. No required automatic resources were missing in the selected page tests; no third-party requests were observed.

[Source URLs, headers and hashes](benchmarks/results/2026-10-28/source-manifest.json), [original snapshot archive](benchmarks/results/2026-10-28/original-snapshot.tar.gz), [candidate page/resource snapshot](benchmarks/results/2026-10-28/candidate-snapshot.tar.gz), [archive hashes](benchmarks/results/2026-10-28/archives.json), [dist baseline manifest](benchmarks/results/2026-10-28/dist-before.json), [integrity verification](benchmarks/results/2026-10-28/verification.json).

| Test page | Path on both local hosts | Content scope |
|---|---|---|
| Home | `/` | CRAN frameset and its three frames versus the redesigned landing page. |
| Windows | `/bin/windows/` | Platform entry pages; redesigned page exposes the current installer directly. |
| Catalog entry | `/web/packages/` | Entry/navigation pages, not a comparison of two complete all-package tables. |
| ggplot2 | `/web/packages/ggplot2/index.html` | Package entry pages; original has much more link/dependency content. |
| Manuals index | `/manuals.html` | Index of manuals, not the full R HTML manuals. |

The original all-package alphabetical table was also captured (4,235,425 B raw) and used in the no-JavaScript navigation check. Its full table is not equated with the redesign's smaller alphabet navigation page. A faster catalog entry would not demonstrate a faster full-list download.

## Browser methodology

| Profile | Viewport / DPR | CDP request latency | Download and upload | CPU slowdown |
|---|---|---:|---:|---:|
| Desktop | 1440 × 900 / 1 | 20 ms | 50 Mbit/s | 1× |
| Mobile emulation | 390 × 844 / 1 | 40 ms | 10 Mbit/s | 4× |

Each page/site/profile/cache group has 10 observations: **400 included page trials**, plus separately preserved smoke/pilot samples. Site order alternates on each repetition. A cold trial uses a new browser context. A warm trial first loads the same page, navigates to `about:blank`, then performs a normal navigation in that same context with HTTP cache enabled. Browser cache hits are distinguished from actual network transfers. Workloads run serially. Server filesystem caches are not cleared; preliminary access primes them for both sites.

Performance Observers collect root FCP, LCP, session-window CLS and long tasks. Navigation Timing provides TTFB (navigation start to first response byte), DOMContentLoaded and load-event timing. CDP network events count frame and asset requests and transferred bytes, including HTTP response headers but excluding TCP/IP overhead. CSS/JS/HTML raw sizes come from the saved files. The configured latency is a DevTools setting, not a measured RTT: main-document Navigation Timing TTFB can be below that setting in this Chrome version, so those values must not be read as WAN round-trip latency. CDP renderer task/script/layout/style duration deltas measure main-thread work; they are not whole-browser process CPU percentages. Observer overhead is included in both variants.

Collection ends 500 ms after the load event for these static pages. Frames have separate observer records. The CRAN root frameset has no top-level FCP/LCP in this experiment; frame timings are retained separately and are not substituted as an equivalent top-level LCP. Mobile emulation is one desktop Chrome engine, not a physical phone. Missing viewport metadata can make original pages use a wider CSS layout viewport despite the same emulated screen.

Quantiles use linear interpolation at `(n − 1) × p` (Type 7). With n=10, p95 is a descriptive upper-tail estimate based heavily on the largest observations, not a stable production percentile. No field INP or other field Core Web Vitals are claimed.

[Raw browser observations](benchmarks/results/2026-10-28/browser.jsonl), [all metrics with p50/p75/p95/min/max](benchmarks/results/2026-10-28/browser-summary.csv), [machine-readable summary](benchmarks/results/2026-10-28/summary.json). Forty observations in the two mobile/cold catalog and ggplot2 groups were conservatively replaced because a brief ancillary HTTP-header probe overlapped those neighboring groups. Selection was based on timestamps, not results. [Initial observations](benchmarks/results/2026-10-28/browser-initial.jsonl), [exclusions](benchmarks/results/2026-10-28/browser-exclusions.json), [replacement observations](benchmarks/results/2026-10-28/browser-repair.jsonl) are preserved.

## Page payloads and requests

Raw sizes are uncompressed bytes, including inline CSS/JS inside HTML. CSS and JavaScript columns count unique external files. Cold request/byte figures are medians of ten runs; bytes include all observed frame/assets and response headers. Logical request counts include browser cache reuse; network request counts require actual transferred bytes.

| Page / site | Main HTML B | All HTML incl. frames B | Unique CSS B | JS B | Logical / network requests | Cold wire B |
|---|---:|---:|---:|---:|---:|---:|
| Home / CRAN copy | 866 | 8,640 | 1,335 | 0 | 10 / 7 | 13,156 |
| Home / Redesign | 10,224 | 10,224 | 28,854 | 3,216 | 5 / 4 | 13,444 |
| Windows / CRAN copy | 1,609 | 1,609 | 1,335 | 0 | 3 / 3 | 7,516 |
| Windows / Redesign | 4,947 | 4,947 | 28,854 | 0 | 4 / 3 | 10,003 |
| Catalog entry / CRAN copy | 4,029 | 4,029 | 2,053 | 0 | 3 / 3 | 8,396 |
| Catalog entry / Redesign | 7,551 | 7,551 | 28,854 | 3,216 | 5 / 4 | 11,617 |
| ggplot2 / CRAN copy | 683,285 | 683,285 | 2,053 | 0 | 5 / 5 | 89,484 |
| ggplot2 / Redesign | 7,743 | 7,743 | 28,854 | 0 | 4 / 3 | 10,773 |
| Manuals index / CRAN copy | 7,795 | 7,795 | 1,335 | 0 | 3 / 3 | 8,924 |
| Manuals index / Redesign | 10,777 | 10,777 | 28,854 | 0 | 4 / 3 | 11,167 |

For ggplot2, the measured root document has 86,576 visible text characters / 8,330 links in the CRAN copy and 3,147 characters / 21 links in the redesign. The original includes extensive reverse-dependency/link lists. This large content-scope difference explains much of the payload reduction and prevents interpreting it as a like-for-like rendering optimization. Feature/content parity needs a separate review before proposing a production replacement.

## desktop / cold: navigation and rendering

Each timing cell is **median / p75 / p95 in milliseconds**; CLS is unitless. N/A means no valid top-level observation, not zero.

| Page / site | TTFB | FCP | LCP | DOMContentLoaded | CLS p50/p75/p95 |
|---|---:|---:|---:|---:|---:|
| Home / CRAN copy | 12.1 / 12.5 / 13.2 | N/A | N/A | 46.2 / 52.1 / 58.7 | 0.0000 / 0.0000 / 0.0000 |
| Home / Redesign | 6.9 / 7.1 / 7.6 | 146.0 / 152.0 / 160.8 | 146.0 / 152.0 / 160.8 | 134.4 / 141.2 / 148.4 | 0.0000 / 0.0000 / 0.0000 |
| Windows / CRAN copy | 15.8 / 16.5 / 17.8 | 114.0 / 120.0 / 126.2 | 114.0 / 120.0 / 126.2 | 54.1 / 57.4 / 68.3 | 0.0000 / 0.0000 / 0.0000 |
| Windows / Redesign | 11.4 / 11.9 / 12.4 | 126.0 / 131.0 / 138.2 | 126.0 / 131.0 / 138.2 | 46.9 / 49.7 / 57.7 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / CRAN copy | 15.6 / 16.2 / 18.3 | 116.0 / 126.0 / 132.0 | 116.0 / 126.0 / 132.0 | 49.2 / 52.5 / 63.5 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / Redesign | 11.4 / 11.9 / 15.9 | 130.0 / 136.0 / 140.4 | 130.0 / 136.0 / 140.4 | 117.8 / 122.9 / 128.4 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / CRAN copy | 11.9 / 12.8 / 13.6 | 228.0 / 235.0 / 236.0 | 228.0 / 235.0 / 236.0 | 66.6 / 68.3 / 75.0 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / Redesign | 7.3 / 8.3 / 9.8 | 132.0 / 135.0 / 142.2 | 132.0 / 135.0 / 142.2 | 46.5 / 50.7 / 59.6 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / CRAN copy | 6.4 / 7.2 / 7.9 | 122.0 / 124.0 / 134.6 | 122.0 / 124.0 / 134.6 | 46.5 / 50.8 / 55.2 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / Redesign | 4.8 / 5.0 / 5.3 | 134.0 / 139.0 / 140.0 | 134.0 / 139.0 / 140.0 | 44.7 / 48.2 / 53.8 | 0.0000 / 0.0000 / 0.0000 |

Home's CRAN **banner frame only**, expressed relative to root navigation, has FCP 123.7 / 132.1 / 180.7 ms and LCP 123.7 / 132.1 / 180.7 ms. These describe that frame and are not a direct replacement for the root metric.

## desktop / warm: navigation and rendering

Each timing cell is **median / p75 / p95 in milliseconds**; CLS is unitless. N/A means no valid top-level observation, not zero.

| Page / site | TTFB | FCP | LCP | DOMContentLoaded | CLS p50/p75/p95 |
|---|---:|---:|---:|---:|---:|
| Home / CRAN copy | 0.7 / 0.8 / 0.9 | N/A | N/A | 7.1 / 7.6 / 8.2 | 0.0000 / 0.0000 / 0.0000 |
| Home / Redesign | 0.8 / 0.8 / 0.9 | 24.0 / 24.0 / 26.2 | 24.0 / 24.0 / 26.2 | 7.5 / 8.0 / 8.3 | 0.0000 / 0.0000 / 0.0000 |
| Windows / CRAN copy | 0.8 / 1.0 / 1.1 | 20.0 / 20.0 / 22.2 | 20.0 / 20.0 / 22.2 | 6.0 / 6.4 / 7.0 | 0.0000 / 0.0000 / 0.0000 |
| Windows / Redesign | 0.8 / 0.8 / 1.0 | 22.0 / 24.0 / 24.0 | 22.0 / 24.0 / 24.0 | 6.9 / 7.3 / 8.0 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / CRAN copy | 0.8 / 0.8 / 0.9 | 20.0 / 20.0 / 24.0 | 20.0 / 20.0 / 24.0 | 5.8 / 6.1 / 6.2 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / Redesign | 0.8 / 0.9 / 1.1 | 24.0 / 24.0 / 26.2 | 24.0 / 24.0 / 26.2 | 7.8 / 8.1 / 8.5 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / CRAN copy | 0.8 / 0.8 / 0.9 | 142.0 / 144.0 / 159.0 | 142.0 / 144.0 / 159.0 | 23.4 / 24.2 / 28.1 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / Redesign | 0.7 / 0.8 / 0.9 | 24.0 / 24.0 / 24.0 | 24.0 / 24.0 / 24.0 | 6.7 / 7.0 / 7.7 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / CRAN copy | 0.8 / 0.8 / 1.1 | 22.0 / 24.0 / 24.0 | 22.0 / 24.0 / 24.0 | 6.3 / 6.5 / 6.8 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / Redesign | 0.8 / 0.8 / 0.9 | 22.0 / 24.0 / 24.0 | 22.0 / 24.0 / 24.0 | 7.3 / 7.5 / 7.8 | 0.0000 / 0.0000 / 0.0000 |

Home's CRAN **banner frame only**, expressed relative to root navigation, has FCP 38.8 / 39.4 / 39.9 ms and LCP 38.8 / 39.4 / 39.9 ms. These describe that frame and are not a direct replacement for the root metric.

## mobile / cold: navigation and rendering

Each timing cell is **median / p75 / p95 in milliseconds**; CLS is unitless. N/A means no valid top-level observation, not zero.

| Page / site | TTFB | FCP | LCP | DOMContentLoaded | CLS p50/p75/p95 |
|---|---:|---:|---:|---:|---:|
| Home / CRAN copy | 12.0 / 12.2 / 16.2 | N/A | N/A | 105.3 / 109.4 / 118.1 | 0.0000 / 0.0000 / 0.0000 |
| Home / Redesign | 7.8 / 8.2 / 9.9 | 482.0 / 518.0 / 551.0 | 482.0 / 518.0 / 551.0 | 471.3 / 511.9 / 544.0 | 0.0000 / 0.0000 / 0.0000 |
| Windows / CRAN copy | 15.9 / 17.3 / 18.5 | 254.0 / 262.0 / 277.2 | 254.0 / 262.0 / 277.2 | 95.3 / 98.3 / 109.1 | 0.0000 / 0.0000 / 0.0000 |
| Windows / Redesign | 12.0 / 12.1 / 12.7 | 340.0 / 355.0 / 404.8 | 340.0 / 355.0 / 404.8 | 96.8 / 98.4 / 100.7 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / CRAN copy | 16.3 / 16.6 / 20.3 | 264.0 / 271.0 / 300.2 | 264.0 / 271.0 / 300.2 | 83.9 / 87.6 / 104.0 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / Redesign | 11.6 / 12.2 / 14.5 | 312.0 / 338.0 / 350.6 | 312.0 / 338.0 / 350.6 | 304.8 / 324.1 / 337.9 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / CRAN copy | 11.9 / 12.5 / 12.6 | 552.0 / 572.0 / 608.8 | 552.0 / 572.0 / 608.8 | 903.5 / 920.5 / 960.1 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / Redesign | 7.2 / 7.5 / 7.9 | 354.0 / 360.0 / 375.0 | 354.0 / 360.0 / 375.0 | 88.6 / 96.1 / 104.1 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / CRAN copy | 7.1 / 7.5 / 8.0 | 292.0 / 296.0 / 340.8 | 292.0 / 296.0 / 340.8 | 94.7 / 98.6 / 111.3 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / Redesign | 4.7 / 5.3 / 6.2 | 340.0 / 346.0 / 383.2 | 340.0 / 346.0 / 383.2 | 97.4 / 100.7 / 112.8 | 0.0000 / 0.0000 / 0.0000 |

Home's CRAN **banner frame only**, expressed relative to root navigation, has FCP 387.8 / 403.8 / 415.8 ms and LCP 387.8 / 403.8 / 415.8 ms. These describe that frame and are not a direct replacement for the root metric.

## mobile / warm: navigation and rendering

Each timing cell is **median / p75 / p95 in milliseconds**; CLS is unitless. N/A means no valid top-level observation, not zero.

| Page / site | TTFB | FCP | LCP | DOMContentLoaded | CLS p50/p75/p95 |
|---|---:|---:|---:|---:|---:|
| Home / CRAN copy | 0.8 / 0.8 / 1.1 | N/A | N/A | 30.0 / 31.8 / 42.4 | 0.0000 / 0.0000 / 0.0000 |
| Home / Redesign | 0.8 / 0.8 / 1.1 | 66.0 / 68.0 / 76.8 | 66.0 / 68.0 / 76.8 | 31.8 / 33.3 / 42.5 | 0.0000 / 0.0000 / 0.0000 |
| Windows / CRAN copy | 0.8 / 0.8 / 0.9 | 34.0 / 36.0 / 38.2 | 34.0 / 36.0 / 38.2 | 22.3 / 23.1 / 24.1 | 0.0000 / 0.0000 / 0.0000 |
| Windows / Redesign | 0.7 / 0.8 / 0.8 | 48.0 / 51.0 / 56.0 | 48.0 / 51.0 / 56.0 | 27.6 / 28.2 / 28.9 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / CRAN copy | 0.9 / 1.0 / 1.3 | 36.0 / 39.0 / 40.0 | 36.0 / 39.0 / 40.0 | 22.0 / 22.5 / 24.3 | 0.0000 / 0.0000 / 0.0000 |
| Catalog entry / Redesign | 0.8 / 0.8 / 0.9 | 60.0 / 60.0 / 64.0 | 60.0 / 60.0 / 64.0 | 31.1 / 31.8 / 33.2 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / CRAN copy | 0.7 / 0.7 / 0.8 | 196.0 / 200.0 / 204.4 | 196.0 / 200.0 / 204.4 | 793.0 / 838.8 / 876.7 | 0.0000 / 0.0000 / 0.0000 |
| ggplot2 / Redesign | 0.7 / 0.8 / 0.8 | 56.0 / 60.0 / 72.8 | 56.0 / 60.0 / 72.8 | 28.4 / 29.8 / 38.3 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / CRAN copy | 0.8 / 0.8 / 1.2 | 42.0 / 44.0 / 79.8 | 42.0 / 44.0 / 79.8 | 23.0 / 24.7 / 37.3 | 0.0000 / 0.0000 / 0.0000 |
| Manuals index / Redesign | 0.8 / 0.8 / 1.0 | 56.0 / 63.0 / 66.2 | 56.0 / 63.0 / 66.2 | 29.5 / 30.7 / 32.0 | 0.0000 / 0.0000 / 0.0000 |

Home's CRAN **banner frame only**, expressed relative to root navigation, has FCP 89.6 / 93.4 / 95.3 ms and LCP 89.6 / 93.4 / 95.3 ms. These describe that frame and are not a direct replacement for the root metric.

## Main-thread work

Cold navigation medians, ms. The full CSV also contains warm results, valid counts and p75/p95/min/max for these counters. One negative warm style-recalculation delta was rejected as an invalid instrumentation value for that counter only (9 valid values in that auxiliary cell); all ten navigation observations remain included and the raw negative value is retained in invalid-cpu-deltas.json. Task duration covers all renderer main-thread tasks in the observation window; script/style/layout columns are narrower counters and do not exhaust it.

| Profile / page / site | Task duration | Script | Layout | Style recalculation | Long-task sum |
|---|---:|---:|---:|---:|---:|
| desktop / Home / CRAN copy | 48.2 | 0.2 | 17.8 | 1.0 | 0.0 |
| desktop / Home / Redesign | 66.5 | 0.6 | 46.5 | 4.1 | 0.0 |
| desktop / Windows / CRAN copy | 22.7 | 0.2 | 9.9 | 0.3 | 0.0 |
| desktop / Windows / Redesign | 41.4 | 0.1 | 29.6 | 0.8 | 0.0 |
| desktop / Catalog entry / CRAN copy | 30.8 | 0.1 | 16.8 | 0.3 | 0.0 |
| desktop / Catalog entry / Redesign | 44.1 | 0.5 | 26.7 | 3.7 | 0.0 |
| desktop / ggplot2 / CRAN copy | 170.4 | 0.2 | 46.2 | 15.0 | 0.0 |
| desktop / ggplot2 / Redesign | 46.5 | 0.2 | 29.9 | 0.7 | 0.0 |
| desktop / Manuals index / CRAN copy | 33.9 | 0.1 | 21.3 | 0.5 | 0.0 |
| desktop / Manuals index / Redesign | 47.5 | 0.2 | 32.1 | 0.9 | 0.0 |
| mobile / Home / CRAN copy | 275.6 | 1.2 | 94.3 | 5.3 | 0.0 |
| mobile / Home / Redesign | 375.3 | 2.1 | 267.5 | 22.3 | 0.0 |
| mobile / Windows / CRAN copy | 120.7 | 0.8 | 47.3 | 1.6 | 0.0 |
| mobile / Windows / Redesign | 220.5 | 0.8 | 153.1 | 5.1 | 0.0 |
| mobile / Catalog entry / CRAN copy | 160.9 | 0.7 | 82.9 | 1.8 | 0.0 |
| mobile / Catalog entry / Redesign | 216.6 | 2.0 | 128.9 | 16.8 | 0.0 |
| mobile / ggplot2 / CRAN copy | 1,084.8 | 1.1 | 365.7 | 80.1 | 109.0 |
| mobile / ggplot2 / Redesign | 249.4 | 0.6 | 154.0 | 3.8 | 0.0 |
| mobile / Manuals index / CRAN copy | 169.6 | 0.8 | 101.8 | 2.5 | 0.0 |
| mobile / Manuals index / Redesign | 218.2 | 0.8 | 133.3 | 5.2 | 0.0 |

## Lighthouse Performance

Ten cold audits per page/site/profile (200 audits), alternating site order, each in a fresh Chrome process. The same custom viewport/network/CPU profiles are applied with DevTools throttling. Effective Lighthouse quiet thresholds are 5,250 ms for both profiles in DevTools throttling mode, FCP timeout 10,000 ms, and maximum load wait 15,000 ms. These custom conditions differ from standard PageSpeed Insights defaults. Scores are lab diagnostics and cannot establish field performance.

| Profile / page | CRAN copy score p50 / p75 / p95 | Valid audits | Redesign score p50 / p75 / p95 | Valid audits |
|---|---:|---:|---:|---:|
| desktop / Home | N/A | 0/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| desktop / Windows | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| desktop / Catalog entry | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| desktop / ggplot2 | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| desktop / Manuals index | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| mobile / Home | N/A | 0/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| mobile / Windows | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| mobile / Catalog entry | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| mobile / ggplot2 | 91.0 / 91.0 / 92.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |
| mobile / Manuals index | 100.0 / 100.0 / 100.0 | 10/10 | 100.0 / 100.0 / 100.0 | 10/10 |

The original frameset home produces `NO_FCP`/unavailable Performance scores. Those are **not converted into zero scores**. The separate frame observer records show that its child documents paint. Preliminary reused-browser audits also produced false `NO_FCP` for the redesign; they were rejected before comparison, and fresh-process diagnostics recovered valid redesign scores. [Pilot exclusions and final method](benchmarks/results/2026-10-28/lighthouse-exclusions.json).

[All raw Lighthouse reports](benchmarks/results/2026-10-28/lighthouse/), [audit summary including FCP/LCP/CLS/TBT/Speed Index and errors](benchmarks/results/2026-10-28/lighthouse-summary.json).

## Controlled local server load

No public CRAN server or mirror was load-tested. Neither wrk, k6 nor ab was installed. The saved dependency-free Node HTTP harness is a closed-loop equivalent for this limited experiment: 1/10/50 concurrent clients, three sequential 5-second admission intervals per condition, with in-flight drain included in elapsed time. Site order alternates. Filesystem caches are primed; keep-alive and gzip are enabled. It requests an equal-count round-robin mix of the five HTML entry URLs, not the complete browser asset graphs. The home request alone is the frameset parent in the original, and the ggplot2 body differs greatly. Thus requests/sec cannot establish equivalent end-user capacity.

Nginx master/worker CPU and summed RSS are sampled through `/proc` every 100 ms. For Nginx/client CPU, 100% means one logical core; WSL host-busy percentage is averaged across all visible logical cores. Summed RSS double-counts shared pages and is not unique physical memory. The load client shares WSL CPU/memory with Nginx; other machine activity, Windows-mounted filesystem behavior and power/thermal state are not isolated.

| Clients / site | HTTP responses/sec median [min–max] | Encoded body MiB/s median | Successful-response latency p50 / p95 / p99 ms | Nginx CPU % median | Peak summed RSS MiB | HTTP errors / client timeouts |
|---|---:|---:|---:|---:|---:|---:|
| 1 / CRAN copy | 114.1 [111.8–121.3] | 1.84 | 8.27 / 15.10 / 22.67 | 17.4 | 6.67 | 0 / 0 of 1737 attempts (0.00%) |
| 1 / Redesign | 203.1 [182.2–229.3] | 0.46 | 4.22 / 9.32 / 13.59 | 9.8 | 6.67 | 0 / 0 of 3076 attempts (0.00%) |
| 10 / CRAN copy | 104.9 [81.6–111.8] | 1.69 | 89.85 / 147.66 / 188.86 | 16.3 | 6.67 | 0 / 0 of 1525 attempts (0.00%) |
| 10 / Redesign | 208.4 [189.9–222.4] | 0.47 | 44.68 / 66.74 / 91.03 | 9.7 | 6.67 | 0 / 0 of 3129 attempts (0.00%) |
| 50 / CRAN copy | 110.2 [109.0–112.4] | 1.76 | 228.45 / 364.51 / 3,439.66 | 16.8 | 6.67 | 0 / 50 of 1801 attempts (2.78%) |
| 50 / Redesign | 188.1 [185.3–195.2] | 0.42 | 167.82 / 300.80 / 2,918.09 | 9.4 | 6.67 | 0 / 20 of 2974 attempts (0.67%) |

Rates count actual HTTP responses; raw completed-attempt rates, which also include client timeouts, are retained separately. Latency quantiles above exclude timed-out requests because their completion latency is unknown. Timeouts are right-censored at the configured 5 seconds; all-attempt distributions are also preserved in JSON. At 50 clients both sites timed out, despite no HTTP 4xx/5xx or Nginx error-log entries. CPU/RSS measurements do not establish the cause of that tail behavior. These results do not represent public CRAN capacity or a production Linux/ext4 deployment.

| Clients / site | Client CPU % median | Client peak RSS MiB | WSL host busy % median | WSL available GiB min | Opened sockets across 3 intervals |
|---|---:|---:|---:|---:|---|
| 1 / CRAN copy | 6.0 | 98.5 | 3.2 | 10.30 | 1, 1, 1 |
| 1 / Redesign | 7.7 | 99.1 | 3.0 | 10.29 | 2, 1, 2 |
| 10 / CRAN copy | 5.5 | 108.6 | 3.2 | 10.15 | 10, 10, 10 |
| 10 / Redesign | 6.4 | 106.1 | 2.9 | 10.25 | 10, 10, 10 |
| 50 / CRAN copy | 4.8 | 111.3 | 3.1 | 9.69 | 50, 50, 50 |
| 50 / Redesign | 6.5 | 110.9 | 2.9 | 9.79 | 50, 50, 50 |

[Raw per-request load samples and resource monitoring](benchmarks/results/2026-10-28/load.json), [Nginx error log](benchmarks/results/2026-10-28/nginx-error.log). The HTTP load client has no browser cache, so requests reach Nginx even when Cache-Control permits caching. It observed stable cache headers/ETags and reuses a small number of sockets; filesystem cache was warm, but gzip was generated on demand.

## HTTP, caching and redirects

For both local copies, all five canonical paths returned 200, compression was gzip, cache control was `public, max-age=300, must-revalidate`, ETags were present, and conditional `If-None-Match` returned 304 with an empty body. Responses use HTTP/1.1 keep-alive. `/bin/windows` redirects once (301) to `/bin/windows/`; the measured canonical page paths have no redirect. An unknown URL returned 404 on both hosts.

Warm page trials produced 0 maximum transferred bytes in the observed page graphs; cache hits still appear as logical browser requests. TTL expiration was not separately tested. No third-party page resources or initial search-index requests occurred. Original production response headers are saved for context, but the public original's Apache policy is not inferred from the controlled Nginx policy.

[Headers, compressed body bytes, redirect and 304 checks](benchmarks/results/2026-10-28/http.json).

## Additional package-name search

There is no directly equivalent package-name search in the tested official page corpus. This is an additional candidate function, not a comparative advantage against an official search implementation. Each profile has 10 first/repeat query pairs for `ggplot2` in fresh contexts. Timing ends when the result DOM is ready, not at a separately measured painted frame. The repeated query reuses the already parsed in-page index.

| Profile / query | Result-DOM time p50 / p75 / p95 ms | Index requests | Encoded body B | Results |
|---|---:|---:|---:|---:|
| desktop / first ggplot2 | 178.1 / 181.2 / 183.2 | 1 | 580,596 | 4 |
| desktop / repeat ggplot2 | 4.7 / 5.0 / 5.4 | 0 | 0 | 4 |
| mobile / first ggplot2 | 759.2 / 768.1 / 786.7 | 1 | 580,596 | 4 |
| mobile / repeat ggplot2 | 10.3 / 11.3 / 11.7 | 0 | 0 | 4 |

The exact package appears first, followed by prefix and other substring matches. The four names are `ggplot2`, `ggplot2.utils`, `ggplot2movies`, `RcmdrPlugin.KMggplot2`. The optional index still contains names and display titles. [Search observations](benchmarks/results/2026-10-28/search.json).

## Windows download scenario

Ten scripted cold scenarios per profile and site run from home until an executable request is initiated. Both target the same R 4.6.1 executable. Its official URL was validated once with HEAD (HTTP 200, 91,749,976 B advertised size). The executable is not included in the local snapshot. Requests are aborted before downloading bytes; a complete executable download is not claimed. These timings include automation and navigation; they are not human completion times or installer-transfer benchmarks. The original base page has an absolute HTTPS CSS link, rebound by CDP to the identical local file without rewriting HTML/CSS. This rebinding can change cache-key or connection reuse relative to public CRAN; scenario time is not a public UX-speed claim.

| Profile / site | Clicks | Time to executable-request initiation p50 / p75 / p95 ms | Successful initiation |
|---|---:|---:|---:|
| desktop / CRAN copy | 3 | 341.7 / 349.6 / 357.2 | 10/10 |
| desktop / Redesign | 2 | 288.2 / 294.4 / 316.1 | 10/10 |
| mobile / CRAN copy | 3 | 845.6 / 853.7 / 878.2 | 10/10 |
| mobile / Redesign | 2 | 785.3 / 791.3 / 821.1 | 10/10 |

[Scenario observations and resource rebinding records](benchmarks/results/2026-10-28/scenarios.json).

## JavaScript-disabled behavior

All 20 direct page checks (five pages × two sites × two profiles) returned 200 with JavaScript disabled. Each site's static package navigation also reached ggplot2 in both profiles. The redesign retained all 26 alphabet links and no-script guidance; no search index was requested. The original home retains frames and links. This checks the selected paths in Chrome, not the whole CRAN link graph or all browser engines. [Raw checks](benchmarks/results/2026-10-28/nojs.json).

## Conclusions supported by these measurements

- The isolated experiment measures selected page implementations under identical local server and throttling settings. It does not establish a public WAN winner.
- The redesign reduces the home page request graph, but does not reduce every page payload. Its shared stylesheet adds first-visit bytes compared with the original small stylesheets. Warm HTTP caching eliminates observed retransfers for both copies.
- The ggplot2 page is materially smaller and its measured rendering costs are lower in this corpus; the large content/link difference prevents claiming an equivalent-content optimization.
- The Windows route exposes the installer in one fewer click. This is a structural navigation result; full executable throughput and human task time remain unmeasured.
- The name-search index is optional and reused for repeated queries. Its first-query cost belongs to the additional search feature and should be reported separately from page-load performance.
- Both local copies show 5-second client timeouts at 50 clients. The shared WSL/DrvFS experiment and differing route payloads are insufficient for deployment capacity estimates or claims about CRAN production infrastructure.
- Before a CRAN proposal makes a broad speed claim, test a known public HTTPS candidate, review content/function parity, and repeat server tests on an isolated native Linux filesystem. Lab scores here are not field INP/LCP evidence.

## Reproduction and retained data

[Commands and tool installation](benchmarks/README.md). Only benchmark tooling was added; site dependencies and architecture were not changed. The dataset retains raw browser JSONL, summaries/CSV, each Lighthouse report, per-request load results, CPU/RSS samples, source archive/hashes, HTTP diagnostics, no-JavaScript checks and excluded pilot observations. Scripts enforce loopback-only load targets. No commit or push was made for this benchmark.
