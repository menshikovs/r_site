# Reverse dependency implementation measurements

Recorded dataset: `2026-10-29/`. Do not overwrite it. Prototype uses the retained
functional-audit RDS and official HTML; the full release uses its own fresh RDS,
DCF and SHA-256 in `full/`. The two snapshots have different counts.

No new tools were installed. Scripts use existing Node, R, Windows file metadata
APIs and benchmark-only Playwright. Runtime site code has no new dependency.

Recorded sequence:

1. Export the saved audit RDS with `scripts/export-cran-data.R` to `prototype.dcf`.
2. `node audits/reverse-dependencies/prototype.mjs`: validate all source records,
   compare the five complete lists against saved official HTML and render only
   five main pages/four nonempty reverse pages.
3. `node audits/reverse-dependencies/browser.mjs prototype`: four viewport widths,
   no JavaScript, counts/lists/anchors/local-external handling/focus/overflow.
4. `powershell -NoProfile -File audits/reverse-dependencies/full.ps1`: measure
   allocation before, run required tests/build/full check, retain the fresh source,
   measure allocation after. Publication is guarded by a 192 MiB added-output
   allowance for this run (three times the reviewed upper estimate).
5. `Rscript audits/reverse-dependencies/expected.R`: independent expectations from
   the exact retained RDS, not from rendered counts.
6. `node audits/reverse-dependencies/measure.mjs`: compare every count and every
   full list to those expectations; calculate raw/gzip sizes and release totals.
7. `node audits/reverse-dependencies/browser.mjs full`: include the current largest
   list, discovered dynamically. `preview.mjs` produces close-ups of the summary.

Scripts target this recorded directory. For a new measurement, adapt the paths
to a fresh directory before running. `full.ps1` refuses existing timing data;
helper scripts may overwrite their own summaries. `prototype-browser-initial.json`
retains the first passing prototype run; the final run corrects initial-request
log collection to stop before explicit reverse-page navigation. Both passed the
same no-auto-fetch assertion.

`disk.ps1` reads FILE_STANDARD_INFO.AllocationSize for each file. This is data
stream allocation, excluding directory/MFT/volume overhead. `measure.mjs` sums
per-file Node gzip estimates. Main-page gzip overhead compares each document with
that same document minus only the summary section, not a different-data release.

`full/status.json` records required-command exits; `test-final-log.txt` includes
the additional staging-budget-failure regression. Full measurements include live
network/R and snapshot-copy costs. Large reverse-page screenshots capture a
viewport, not a potentially hundreds-of-thousands-pixel entire list. Completeness
is validated from the DOM and from every generated HTML list independently.

See [PERFORMANCE.md](../../PERFORMANCE.md), [ARCHITECTURE.md](../../ARCHITECTURE.md)
and [CRAN_FUNCTIONAL_PARITY.md](../../CRAN_FUNCTIONAL_PARITY.md) for results and
remaining parity limitations. No commit or push was made.
