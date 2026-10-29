# Local mirror compatibility experiment

Report: [CRAN_MIRROR_COMPATIBILITY.md](../../CRAN_MIRROR_COMPATIBILITY.md).
This is a **limited official corpus and generated frontend**, not a complete
CRAN mirror. No public rsync/load tests, installations, commits or production
configuration changes are part of these scripts.

Observed toolchain: Windows Node 26.11.1 earlier in the run and 26.13.0 at final
verification (not pinned), Windows R 4.5.2, existing Chrome and Playwright;
WSL Ubuntu Node 22.22.1, Nginx 1.28.3, rsync (version captured in the
preceding adoption audit). No new tools/dependencies were installed.

Inputs retained in this workspace:

- `../adoption/.cache/generated`: full generated output from the saved official
  snapshot, with exact DCF/RDS and manifest in the adoption result directory.
- `/var/tmp/cran-adoption-20261029/releases/r2`: same generated output merged
  with the limited official corpus, on native ext4.
- `/var/tmp/cran-adoption-20261029/original`: original 30 official files. The
  portable copy is retained as `../adoption/2026-10-29/official-snapshot.tar.gz`.
- `2026-10-29/fixtures.json`: reproducible synthetic records. These names,
  versions, descriptions and mirror entries are test data, never CRAN claims.

The `.cache` directories are ignored; a new clone does not contain a complete
generated snapshot. Reproduce the earlier adoption preparation or supply a new
isolated full build and record its manifest before claiming an identical full
corpus replay. Live upstream rebuilds are not byte-reproducible from URLs alone.
The offline fixture tests remain reproducible directly from their scripts and
the retained official corpus. Do not contact public mirrors to imitate load.

For a direct replay in this retained workspace, the prepared native stand remains
on disk: start Nginx with the saved `2026-10-29/nginx.conf` (`nginx -c` via WSL),
run `probe.mjs`, then stop that exact configuration. Re-running setup is not
necessary. The probe repairs and rolls back the disposable mirror to A each time.

Sequence used (from project root):

1. `node tests/site.test.mjs` runs all 24 offline regressions.
2. `node audits/mirrors/prepare.mjs` runs real `buildSite` on fixtures A/B and
   prepares a full candidate with the production URL writer. The full archive
   render predates explicit `rel=external`; `archived-html.mjs` applies exactly
   those provenance annotations before converting paths. This is not a new
   full fetch/build. Source files and `dist` are not rewritten by preparation.
3. `wsl.exe -d Ubuntu -- sh /mnt/c/Users/User001/r_site/audits/mirrors/setup.sh`
   creates the isolated ext4 stand. `native-full.mjs` reads the previous native
   output instead of slowly packing/copying 33k Windows files. `stamp-fixtures`
   gives identical bytes identical mtimes and changed bytes distinct mtimes.
   Nginx listens only on 8101–8104 and 8111–8113, with its own PID/config/log.
4. `node audits/mirrors/probe.mjs` uses existing Chrome/Playwright. It blocks
   non-loopback browser requests, records baseline, runs HTTP/browser/search
   checks, syncs A, models an interrupted update, repairs to B and rolls back A.
5. Run `measure-native.mjs` and `verify-native.mjs` through WSL Node. The first
   measures normal A→B and rollback and checks every B hash; the second scans all
   HTML links, verifies the full candidate and original resource hashes.
6. The unchanged `../adoption/client.R` receives each base URL without a trailing
   slash: `http://127.0.0.1:8101`, `...:8102/CRAN`, `...:8103/pub/CRAN`. It reads
   the local repository index only, does not install packages, and unsets proxy
   variables only within its own process.
7. Optional disposable negative: WSL `sh audits/mirrors/negative.sh` (use its
   absolute `/mnt/c/...` path). It demonstrates raw-overlay deletion in a **new**
   `unsafe-negative` directory, never in original/full/production trees.
8. For the normal full checker, run native-full with `CRAN_NATIVE_MODE=standalone`,
   then `CRAN_CHECK_ROOT=/var/tmp/cran-mirrors-20261029/check node scripts/check-site.mjs`
   via WSL with absolute script paths. Mirror-mode uncopied native resources are
   separately inventoried by the verifier, not silently exempted from the checker.
9. `node audits/mirrors/final-verify.mjs` checks retained outcomes and hashes of
   production output, CSS/data source and 8080 config. It validates report links.

The stand uses a fixed, checked absolute directory and refuses a completed stand
on setup rerun (`ready` marker). To replay, use a new explicitly chosen directory
and update all script/config constants together; do not run recursive cleanup on
computed or shared CRAN paths. Preserve the previous result directory or choose
a new result directory. Source/destination for all `--delete` calls are fixed
isolated paths; changing those requires review.

Stop only this instance:

```powershell
wsl.exe -d Ubuntu -- nginx -s quit -c /mnt/c/Users/User001/r_site/audits/mirrors/2026-10-29/nginx.conf
```

Failure evidence is retained: `quick-check-mismatch.json` (same-size/same-second
catalog change missed before deterministic fixture timestamps), `interrupted.txt`
(partial state plus intentional source error), `unsafe-overlay-negative.txt`.
Preparation tar EOF is explained in the report; unused partial packaging lives
only in ignored `.cache`. It was not an rsync or CRAN failure.

Results do not demonstrate all mirrors, remote network throughput, production
HTTPS/cache behavior, full native-resource coverage, universal HTML sanitization,
WAN fault recovery or a transaction across independently cached browser requests.
