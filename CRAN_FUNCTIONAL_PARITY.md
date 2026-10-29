# CRAN Functional Parity & Package Metadata Audit

Date: 2026-10-29 (Europe/Riga). Frontend examined before changes: the current `dist/`, with 25583 package pages. A separate official RDS snapshot contains 25584 current records: publishing continues between requests.

**Update following a separate decision:** reverse dependencies have been implemented as
a two-level static interface. The historical matrix and proposal below describe
the state at the time of the initial audit; they should not be read as the current
status of the reverse dependency feature. Current behavior and actual measurements appear in
the “Reverse dependency implementation” section at the end of this document and in `PERFORMANCE.md`.

## Conclusion and scope

**The current site cannot yet replace the official CRAN interface without losing significant information.** It is suitable as a static frontend overlay that retains access to official resources. Corruption of the checked metadata fields and missing reverse dependencies have now been addressed (sections 7 and 9). Official adoption still requires reliable, complete navigation to materials and download variants, short URL compatibility, and an agreed deployment boundary. The initially smaller ggplot2 HTML was largely explained by missing content; reverse lists are now retained in a separate document.

The audit and plan below were prepared **before production code changes**. The initial implementation was limited to small fixes; reverse dependencies required a separate decision, subsequently obtained and implemented in section 9.

Source evidence is retained in [audits/functional-parity/2026-10-29/](audits/functional-parity/2026-10-29/): five official HTML files, five redesign pages before fixes, one official `packages.rds`, its columns/DCF, structured content, HEAD results, and a reverse graph estimate. Official pages were downloaded with six sequential GETs (five HTML files and the RDS), spaced 600 ms apart. Resource validation uses bounded HEAD requests without downloading PDFs, tarballs, or binaries. Network checks do not cover every one of the tens of thousands of links.

## 1. Representative packages and validity of the comparison

All five official `/web/packages/<name>/index.html` pages returned HTTP 200. Each official `<link rel=canonical>` points to the short `https://CRAN.R-project.org/package=<name>` URL. Local package paths exist. Primary versions and publication dates agree between the saved pages and RDS; the time of day in the RDS is more precise than the date on the HTML page and is not an error. Primary pages examined: [ggplot2](https://cran.r-project.org/web/packages/ggplot2/index.html), [data.table](https://cran.r-project.org/web/packages/data.table/index.html), [Rcpp](https://cran.r-project.org/web/packages/Rcpp/index.html), [termr](https://cran.r-project.org/web/packages/termr/index.html), [MASS](https://cran.r-project.org/web/packages/MASS/index.html). Exact responses from the audit date are saved locally.

| Package | Version | Date on official page | Official HTML, B | HTML links |
|---|---|---|---:|---:|
| ggplot2 | 4.0.3 | 2026-04-22 | 683435 | 8332 |
| data.table | 1.18.6.1 | 2026-08-24 | 209033 | 2401 |
| Rcpp | 1.1.2 | 2026-07-05 | 578490 | 7411 |
| termr | 1.0.1 | 2026-10-21 | 6939 | 32 |
| MASS | 7.3-66 | 2026-07-15 | 250267 | 3230 |

Link counts include repetitions and do not equal the number of required features. Between the performance audit and this snapshot, ggplot2's link count changed from 8330 to 8332; page size is not constant.

MASS exists at the ordinary package route but has `Priority: recommended`. The RDS also contains R-version-specific compatibility rows with `Path`. Existing filtering retains the unscoped current record and excludes scoped variants; MASS's current record is retained. Simply selecting the last row or inserting an old scoped version into the source URL is incorrect. Binary variants can have different versions/paths independently of the current source release.

## 2. Functional compatibility matrix before fixes

Legend: “present” means the information is displayed; “text” means the value is present but navigation semantics are lost; “absent” means missing from the local page, even if reachable through the general Official CRAN link. That general link is a workaround, not full interface parity. “—” means the corresponding field/section is absent from this official HTML, not proof of absence throughout CRAN.

| Information | ggplot2 | data.table | Rcpp | termr | MASS | Redesign before fixes / source |
|---|---|---|---|---|---|---|
| Package / Title / Version | present | present | present | present | present | Present, values agree; RDS |
| Description | present | present | present | present | present | Present; DCF normalizes wrapping, HTML-safe output |
| Publication date | present | present | present | present | present | `Date/Publication` present; UTC time retained |
| Authors | present | present | present | present | present | **Corrupted**: `Authors@R` continuation lines leak into `Author` |
| Unicode in authors | present | present | present | present | present | Windows C locale produces literal `<U+...>` escapes instead of names |
| Maintainer | present | present | present | present | present | Present; `at` in CRAN HTML is email obfuscation, not an address mismatch |
| License | present | present | present | present | present | Value present as text; license/file hyperlinks missing |
| Depends / minimum R | present | present | present | present | present | Text with version constraints; R is not a separate package |
| Imports | present | present | present | present | present | Text without package/base manual navigation |
| LinkingTo | — | — | — | — | — | Supported by exporter/template; absence in the sample is not a defect |
| Suggests | present | present | present | present | present | Text without navigation |
| Enhances | sp | — | — | — | — | **Dropped** by exporter and template |
| Reverse dependencies | 4 categories | 4 categories | 4 categories | — | 4 categories | No counts or lists; data already exists in RDS |
| SystemRequirements | — | — | — | — | — | Supported when present in RDS; never fabricated |
| Priority / recommended | — | — | — | — | recommended | Dropped by exporter and template |
| Contact | — | — | — | — | MASS email | Dropped by exporter and template |
| Upstream URL / repository | present | present | present | present | present | Clickable URL from RDS; repository is not always a separate field |
| BugReports / issue tracker | present | present | present | present | — | Present when supplied; URL does not replace BugReports |
| Source archive current version | present | present | present | present | present | Present, matches the official source link |
| Reference PDF | present | present | present | present | present | Present, HEAD checked; PDFs not downloaded |
| HTML reference manual | present | present | present | present | present | No dedicated link; accessible through Official CRAN |
| Vignettes | 5 entries | 12 entries | 10 entries | — | — | Unconditional directory link, **404 for termr** |
| README / NEWS / ChangeLog | R/N | R/N | R/N/C | R/N | N/C | No direct links; source filenames absent from RDS |
| CRAN checks | present | present | present | present | present | No direct link despite a stable official route |
| Task Views | 5 | 5 | 3 | — | 8 | Absent; membership missing from selected RDS fields |
| Old sources archive | present | present | present | — | present | Absent; an archive cannot be assumed for every package |
| Windows/macOS binaries | present | present | present | present | present | No per-R/per-architecture variants |
| DOI CRAN package | present | present | present | present | present | DOI field exists in RDS but is discarded |
| ORCID / identifiers | ORCID links | ORCID links | ORCID links | — | — | Author URL linkification supported, but parser/encoding corrupts the field |
| Citation resource | present | — | present | — | present | No direct links/record |
| Canonical long path | present | present | present | present | present | Local `/web/packages/<name>/index.html` retained |
| Canonical short form | present | present | present | present | present | No generated `/package=<name>` resolver; hosting policy required |
| Internal anchors | No IDs in these 5 HTML files | same | same | same | same | `#main`/`#top` exist; no arbitrary-anchor contract claimed |

Full observed values and links, including individual category labels, are in [official-structure.json](audits/functional-parity/2026-10-29/official-structure.json). The matrix does not count CSS, logos, repeated canonical links, or every reverse link as a separate required feature.

Adoption requires correct identity/description/version/authorship/license, requirements/dependency relationships, source/documentation/check navigation, permanent routing, accessibility, and no invented resources. Reverse dependencies are particularly important to maintainers and ecosystem analysis. Task Views, README/NEWS, citation, and binary choices are substantial workflows; losing them requires explicit agreement rather than concealment behind a general link. Duplicated decorative presentation and thousands of repeated hrefs need not be reproduced on the initial screen.

## 3. Where data is lost

1. `packages.rds` contains 70 columns, including **all five `Reverse ...` fields**, `Enhances`, `Priority`, `Contact`, `DOI`, `OS_type`, `Archs`, and `Additional_repositories`. An additional reverse API or new bulk crawl is **unnecessary**. The column list is retained in `rds-columns.txt`.
2. `scripts/export-cran-data.R` exports a limited whitelist. It retains `Authors@R` but drops the additional fields and reverse columns listed above. The missing reverse UI results from pipeline/template choices, not missing CRAN data.
3. `parseDcf` allows only `[A-Za-z0-9./]` in field names. Consequently, `Authors@R:` is not recognized and its continuation lines are appended to the preceding `Author`. The same issue affects hyphenated fields and space-containing `Reverse imports`. Confirmed on five packages and an offline fixture; `Authors@R` must never be executed through `eval`.
4. In this Windows environment, R rejects the inherited `C.UTF-8` and falls back to locale `C`. `write.dcf` formats Unicode as `<U+00F1>` and similar escapes; a UTF-8 file connection alone is insufficient. A local test with UTF-8 LC_CTYPE retains `Iñaki, Giné-Vázquez, Žluťoučký`. Export must explicitly guarantee UTF-8 or fail while preserving the previous build.
5. `renderPackage` already displays source fields but does not interpret dependency tokens as links. Metadata does not substantiate the unconditional `.../vignettes/` URL. PDF/source URLs match official URLs in all five examples; concrete downloads are confirmed by HEAD where the server responded, and a timeout is not classified as a 404.
6. README/NEWS/vignette inventories, current binary filenames/versions, and citation/Task View membership are not available as ready-made resource lists in the RDS. `VignetteBuilder` and `BuildVignettes` do not establish that a particular vignette is published. Resources cannot be inferred from `Suggests: knitr` alone or filenames guessed.

## 4. P0 / P1 / P2 plan prepared before implementation

| Priority | Confirmed problem | Solution | Scope / decision |
|---|---|---|---|
| P0 | Author corrupted by `Authors@R` continuation | Fix DCF field parser; dedicated regression fixture | Small fix now |
| P0 | Unicode lost during R DCF export | UTF-8 locale inside exporter, restore on exit, fail closed, R fixture | Small fix now |
| P1 | Enhances, recommended/Contact/DOI lost | Retain explicit RDS fields and show nonempty values | Small fix now |
| P1 | Incorrect unconditional vignette URL | Remove availability claim; link to existing official documentation/downloads page | Small fix now |
| P1 | Dependency navigation lost | Links only to existing current package set; handle R/base separately | Small fix now |
| P1 | CRAN check navigation missing | Add direct official checks URL without copying changing results | Small fix now |
| P0 for full replacement | Reverse dependencies missing | Compact counts + separate no-JS static pages | **Proposal only**, separate decision |
| P1 for adoption | Materials, binary variants, license links, Task Views/citation incomplete | Official resource manifest and explicit availability/freshness | **Proposal**, not a crawl of 25k package pages |
| P0 for public replacement | Short canonical URLs and resource trees | Agree server rewrite/overlay and archive/manual/binary preservation | Requires hosting owner's decision |
| P2 | Citation/OG presentation and decorative parity | Retain identifiers; discuss richer metadata separately | Not required to fix primary errors |

Static architecture, search matching and the `[Package, Title]` index, canonical long routes, and atomic staging builds remain unchanged. Empty fields receive no invented values. OS/architecture constraints and additional repositories should be retained with explicit metadata fields when present, without guessing supported binaries.

## 5. Reverse dependencies: historical proposal (implementation in section 9)

The official RDS already contains `Reverse depends`, `Reverse imports`, `Reverse linking to`, `Reverse suggests`, and `Reverse enhances`. Keep categories separate: Imports and LinkingTo for the same dependent package are different edges, so the category total is not the number of unique dependent packages. Show absent categories as 0 only with a verified complete metadata snapshot, not when the source is unavailable.

The saved RDS has 25584 current packages, **7951** with at least one nonempty reverse category, and **243430** category edges. RDS counts agree with the saved official HTML for all five packages:

| Package | Reverse Depends | Reverse Imports | Reverse LinkingTo | Reverse Suggests | Reverse Enhances |
|---|---:|---:|---:|---:|---:|
| ggplot2 | 480 | 5398 | 0 | 2354 | 8 |
| data.table | 74 | 1940 | 0 | 301 | 6 |
| Rcpp | 172 | 3445 | 3674 | 56 | 0 |
| termr | 0 | 0 | 0 | 0 | 0 |
| MASS | 325 | 2023 | 0 | 843 | 2 |

Proposed design:

- A compact section on the main page with five category counts and ordinary links. Do not include thousands of names in the main HTML, hidden DOM, inline JSON, or automatic fetches.
- Generate `/web/packages/<name>/reverse-dependencies.html` **only for the 7951 packages with nonempty lists**, with anchors `#depends`, `#imports`, `#linking-to`, `#suggests`, and `#enhances`. For other packages, show a verified “No reverse dependencies in this snapshot” message without an additional file.
- Full lists use ordinary `<ul><li><a>` without JavaScript; targets are local only for names in the current package set. Ordering is deterministic and escaping mandatory. Large pages load only through explicit navigation. Preserve duplicates across categories.
- **25680 edges refer to 2933 distinct names outside the current CRAN set** (for example, Bioconductor packages). Do not generate broken local package links for them. Initially, show names as text and provide the official CRAN source package page for verified external navigation. Direct links to each external package require a verifiable source mapping; an RDS name alone is insufficient. Do not guess an ecosystem from a name.
- Build and publish reverse resources from the same RDS snapshot in one atomic release, retaining the source date/hash. Export must verify all five reverse columns: a missing column or invalid snapshot must not become zero counts. Refresh at the current build cadence. Copying check status or repeatedly querying a separate package runtime API is unnecessary.

### Cost before a separate decision

Calculated from the actual snapshot without generating 7951 new files:

| Metric | Estimate |
|---|---:|
| Additional HTML files | 7951, approximately +31% over the current 25655 HTML files |
| Category edges | 243430 |
| List HTML using the explicit formula `<li><a href=...>name</a></li>` | 15923232 B (~15.2 MiB) |
| Including an assumed 2500 B shell per page | 35800732 B (~34.1 MiB) before gzip |
| Main page counts section | Approx. 0.5–1.2 KiB per package; verify with prototype |
| Counts sections on 25584 main pages | An additional ~12.5–30.0 MiB if every package has a section |
| Lists + counts, overall estimate | ~46.6–64.1 MiB, excluding filesystem/staging overhead |
| Additional build-time network for reverse data | 0: RDS of ~12.7 MB already downloaded |
| Runtime JS / API / auto requests | 0 |

This is logical payload, not actual disk allocation; account separately for filesystem blocks, release staging/backup, and compression. The fixed 2500 B shell is an estimator assumption, not a finished template. Gzip ratio was neither measured nor promised.

Estimated CPU work is linear in 243430 edges, with 7951 additional file writes. Wall time was not measured because implementation requires a decision. A rough sensitivity range of 1–10 ms/file implies 8–80 s for file operations alone, plus rendering/validation; `/mnt/c` may cost more. The earlier investigation supports measurements on native ext4 and the target build host. Before adoption: prototype five packages, measure a full unpublished release, and check the server inode/file budget and atomically staged disk footprint.

An alternative is 26 shared static reverse-list pages by initial letter: fewer files but much larger documents with unrelated content and worse navigation. A giant shared JSON file requires JavaScript for core functionality and is unsuitable here. Separate HTML per nonempty package is preferred once costs are agreed.

## 6. Additional official sources and risks

Source/binary/download/resource parity needs a manifest of published resources rather than assumptions based on version. Potential sources: the official CRAN publishing pipeline (most reliable for adoption), static `PACKAGES`/`PACKAGES.rds` from the relevant Windows/macOS/R-version repositories, `VIEWS`/Task View definitions, and explicit package material inventories. Verify the availability/format of each additional source first. Downloading 25k package HTML files on every build without a separate decision is not proposed.

A snapshot consistency policy is needed: binary repositories may lag source, and RDS updates while other pages are being acquired. Do not label an old binary with the current source version. Optional README/NEWS/CITATION may be absent; absence must not produce an invented download link. License content in `file LICENSE` cannot be replaced by the name MIT alone. An empty metadata field and an HTTP failure are different states.

The short form `/package=<name>` is the official permanent URL; the long path is an existing document. Standalone static hosting does not automatically support the short route; a CRAN overlay may use existing rewrite rules. Do not generate another 25k alias files or automatically rewrite 8080. Agree resolver and canonical policies separately; preserve long routes in the current fixes.

## 7. Implementation and validation

### Small fixes completed

- Fixed the DCF parser: `Authors@R`, hyphenated names, and reverse headers containing spaces are no longer lost or appended to the previous field. An unrecognized line clears the continuation target. Metadata R code is never executed.
- The R exporter selects UTF-8 LC_CTYPE for the operation, restores prior state, and explicitly fails the build if correct UTF-8 export is impossible. The file connection closes before locale restoration. The regression test also runs in the original Windows environment with its unsupported `C.UTF-8`.
- Added `Enhances`, `Priority`, `Contact`, `DOI`, `OS_type`, `Archs`, and `Additional_repositories` to the whitelist; the template displays only explicit nonempty values. DOI links appear only for a DOI supplied in the data, never inferred from a package name.
- Forward dependencies now link to existing generated package pages. The package-name set is built once per build; unknown names remain text, and an R-version constraint does not become a package link. Base R packages link to the corresponding official reference manuals. Version constraints are retained.
- Removed the universal link to nonexistent vignette directories. It is replaced by an explicitly labeled “Documentation and downloads on CRAN” link to the verified official package page. Added CRAN check results navigation. This is an accessible fallback, **not** a complete material inventory.
- Corrected the obsolete JSON shard description and full package-content parity claim in `CRAN_COMPATIBILITY.md`.

No new reverse dependency HTML pages, aliases, resource inventories, APIs, or runtime dependencies were added. CSS, `public/search.js`, the search format, and name-only matching were retained. Source/PDF links, installer logic, canonical long paths, and staging/atomic publication were unchanged.

### Accuracy and functionality checks

[final-verification.json](audits/functional-parity/2026-10-29/final-verification.json) independently compares Title, Description, Version, and **all displayed metadata fields** on five pages against UTF-8 DCF exported from the saved RDS. DOM text comparison normalizes whitespace only. All values matched; missing fields were not replaced with fabricated empty values. Reverse category counts were also checked against actual links in the official HTML.

Checked 27 logical external resources using 31 HEAD requests including redirects. Results: **22 HTTP 200, 3 HTTP 404, 2 timeouts**. PDFs for all five packages returned 200. Vignette directories for `termr` and `MASS` returned 404; the presumed `/src/contrib/Archive/termr/` also returned 404, so no archive link was invented. Official short URLs and checks for termr/MASS, and termr README/NEWS and upstream/issues links passed. Source archives for ggplot2 and MASS have the same URLs as the official HTML, but HEAD timed out: availability remains unverified rather than classified as an error. DOI/ORCID and thousands of reverse URLs were not queried individually. See [link-checks.json](audits/functional-parity/2026-10-29/link-checks.json).

All required commands completed with exit code 0:

| Check | Result |
|---|---|
| `npm test` | 17/17, including new regression tests |
| `Rscript tests/export-cran-data.R` | Passed: Unicode, retained fields, current/scoped row filter |
| `npm run build` | Full build, 25585 packages / 81 mirrors |
| `npm run check:site` | 25657 HTML pages, all local href/src and search shape |
| Browser QA | 31 records without errors |

Browser QA covers five package pages × 320/390/768/1440 px with JavaScript disabled, canonical long paths, displayed fields, no horizontal overflow, visible focus, and local link/anchor checks. At every width, the no-JS alphabetical catalog led to all five packages. Search queries `termr`, `ggplot2`, and `plot` were checked separately. Screenshots were saved and representative mobile/desktop results inspected. On the standalone server, `/package=termr` correctly returned 404: the hosting limitation is recorded; no alias/rewrite was added. Core no-JS functionality remains ordinary HTML.

The first QA run stopped because of Chrome's handling of the test server's empty expected-404 response; this check was moved to the HTTP client and the pilot JSON retained separately. This corrects the audit harness, not a page defect. The final result is in [browser-qa.json](audits/functional-parity/2026-10-29/browser-qa.json).

R still prints startup warnings about the inherited locale before the script begins; the exporter now explicitly chooses a working UTF-8 mode. Unicode correctness is confirmed by both the fixture and real Rcpp/data.table names, not the absence of a warning. Command logs, timings, and hashes are retained in the audit directory.

### Sizes before and after

Sizes are UTF-8 bytes; gzip is a local Node gzip estimate, not a new network performance audit. HTML before fixes is saved separately. Versions of the five representative packages did not change during the audit.

| Package | HTML before / after, B | gzip before / after, B | Links before / after |
|---|---:|---:|---:|
| ggplot2 | 7743 / 8859 | 2370 / 2432 | 21 / 64 |
| data.table | 15686 / 8809 | 4053 / 3006 | 21 / 32 |
| Rcpp | 7836 / 7524 | 2266 / 2217 | 21 / 29 |
| termr | 5208 / 6206 | 1808 / 1947 | 11 / 26 |
| MASS | 4686 / 5237 | 1685 / 1746 | 10 / 21 |

ggplot2 grew by 1116 B HTML / 62 B gzip, mostly useful dependency links and explicit metadata. data.table and Rcpp HTML shrank after removal of incorrectly appended `Authors@R`, without removing the human-readable author list. All forward dependencies were already present as text; thousands of reverse links were not added. data.table's genuinely long author list still occupies substantial vertical space: retained information, not a new interface component.

| Full build | Before | After |
|---|---:|---:|
| Package pages | 25583 | 25585 |
| HTML files | 25655 | 25657 |
| All files | 25660 | 25662 |
| Logical size | 150723124 B | 164377749 B |

The two additional files/packages reflect CRAN updates between snapshots, not a new page system. Total payload grew by 13654625 B (~9.1%): useful hyperlinks and additional fields have a cost across the complete catalog. This does not estimate allocated filesystem blocks; atomic staging temporarily needs both new and previous releases. A separate reverse feature could add approximately 34.1 MiB of lists and 7951 files, plus 12.5–30.0 MiB of main-page counts markup, and is **not included** in this result.

Measured full build time: **104.2 s**, including network and R import/export. From the `Generating static HTML...` message to completion: **24.3 s**, including generation, writes, and publication/cleanup. An exact comparable full-build time before fixes was not recorded; no causal speedup/slowdown is claimed. The subsequent full build used a newer RDS (25585 current packages), whereas the reverse graph estimator uses the saved 25584-record snapshot. The standard build additionally fetched its ordinary official indexes/manuals/platform pages; no 25k-package HTML crawl was performed. See [build-timing.json](audits/functional-parity/2026-10-29/build-timing.json), [sizes-after.json](audits/functional-parity/2026-10-29/sizes-after.json).

## 8. Remaining decisions before official adoption

Corruption/Unicode problems and the listed small omissions have been fixed. At the initial audit, replacement was blocked by reverse dependency discovery, resource/binary inventories, license-file/citation/Task View workflows, and short URL / overlay deployment. Reverse discovery was subsequently addressed in section 9; other items remain open. General links to the official interface preserve access to that information but do not remove dependence on the original interface.

The next separate decision was whether to accept the proposed reverse counts + up to 7951 static pages and a temporary plain-text fallback for non-CRAN dependent names. Until acceptance, these pages would not be generated and the resource acquisition pipeline would remain unchanged. Implementation would then require a separate prototype, sample parity checks, full build/disk measurements, and agreement on external package link mappings.

During the initial audit, the reverse system was deferred pending a separate decision. After that decision, the implementation below was completed. No commit/push was performed.

## 9. Reverse dependency implementation following a separate decision

After the initial audit, the user separately authorized this implementation.
The historical proposal in section 5 is now implemented: five compact counts on
the main page and separate no-JavaScript HTML only for nonempty lists.
Anchors are permanent: `depends`, `imports`, `linking-to`, `suggests`, `enhances`.
All five categories appear even when counts are zero; zero counts are not links.
For `termr`, the checked newer snapshot still has no separate file.

All five RDS columns are required; explicitly empty fields differ from missing fields.
Names are sorted deterministically; duplicates within a category and invalid values
stop the build. Duplicates across categories are retained. Both levels use
the same current record set and are included in one atomic publication.

External dependent names are **plain text only**. The previously proposed link to
the source package's official page is not substituted for a missing
dependent's link: there are no fabricated local pages or guessed CRAN/Bioconductor/GitHub URLs.
No external link mapping source was added. Search, its index, and runtime architecture
are unchanged; full lists are absent from the main DOM and inline JSON and are not fetched
when the main package HTML is opened.

The five-package prototype matched the full lists in the saved official HTML/RDS.
A subsequent full build from 25585 current records produced **7949 pages,
243449 category edges**, including 25680 to names outside the current set. An
independent comparison of retained RDS against HTML passed for every package. The difference from
the historical 7951/243430 reflects upstream updates, not a fixed implementation limit.

The feature added **54135342 B HTML** (main counts + reverse pages), estimated gzip
**14312370 B**; actual `dist` file allocation increased by **55271424 B**.
Generation/publication: 62.1 s; full build with network/R: 248.5 s; validation of all
33606 HTML files: 62.3 s. Node 21/21, R regression, build, check:site, and 24 responsive
no-JS scenarios passed. The largest current list is `testthat`, with 14429 relationships,
931086 B of separate HTML; its main page is 7783 B.

Full methodology, prototype/current tables, allocation/gzip caveats, and raw
result links: [PERFORMANCE.md — Reverse dependencies](PERFORMANCE.md).
Source snapshots and logs: [audits/reverse-dependencies/2026-10-29/](audits/reverse-dependencies/2026-10-29/).

Reverse dependency discovery is no longer an outstanding parity-audit item.
The resource/binary inventories, Task Views/citation,
license-file workflow, and short canonical URL hosting policy listed above remain open. No commit/push
was performed.
