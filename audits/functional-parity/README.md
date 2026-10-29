# Recorded functional parity audit

See [CRAN_FUNCTIONAL_PARITY.md](../../CRAN_FUNCTIONAL_PARITY.md) for findings,
implemented fixes and the unimplemented reverse-dependency proposal.

`2026-10-29/` retains the initial official HTML and RDS, pre-change generated
pages, the old lossy DCF export, corrected representative UTF-8 export, resource
HEAD checks, graph estimates, build/test logs, before/after sizes, DOM checks,
screenshots and SHA-256 manifests. The pre-fix DCF/JSON is evidence of the
encoding/parser problem, not the authoritative Unicode representation. The RDS
is authoritative; `representative-utf8.dcf` preserves its text correctly.

Scripts are recorded-run tools, use the date directory explicitly and require
the existing R installation and benchmark-only Playwright. No runtime site
dependency was added. `fetch.mjs` refuses an existing source manifest. Before a
new acquisition, copy/adapt the result paths in these scripts to a fresh date;
do not overwrite the retained dataset. Keep the six-GET limit and HEAD request
cap/pacing. Never crawl the full package-page tree to reproduce this audit.

Acquisition/analysis order:

1. `node audits/functional-parity/fetch.mjs`
2. `Rscript audits/functional-parity/inspect.R` (initial exporter snapshot)
3. `python audits/functional-parity/inspect.py`
4. `node audits/functional-parity/links.mjs`
5. `Rscript audits/functional-parity/reverse-cost.R`

The first DCF/HTML snapshot was captured before production fixes. Repeating
`inspect.R` with the fixed exporter will naturally produce corrected DCF; use
the retained pre-fix files when inspecting the original failure.

After making only the approved small corrections:

1. `powershell -NoProfile -File audits/functional-parity/validate.ps1`
2. `Rscript audits/functional-parity/export-representative.R`
3. `node audits/functional-parity/browser.mjs`
4. `node audits/functional-parity/verify.mjs`

`browser.mjs` starts and closes its own loopback static server on a random port;
it does not modify Nginx or port 8080. Its standalone short-form URL check records
the existing 404 limitation. `verify.mjs` checks DOM fields against the RDS and
uses the prior performance audit's source hashes to confirm unchanged CSS/search.
Full build timing includes live network inputs and is not a controlled before/
after speed comparison. Native ext4 is preferable when measuring filesystem
performance, as established in the earlier investigation.
