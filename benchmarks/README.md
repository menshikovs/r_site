# Reproduce the CRAN comparison

The website build and dependencies are not modified. Benchmark-only Chrome/Lighthouse tools are pinned in `tooling/package-lock.json`. Raw results, snapshots and SHA-256 manifests are kept under `results/2026-10-28/`.

Requirements: an existing `dist/`, Node >=22.19, installed Chrome, Ubuntu WSL with Nginx and Node. Adjust absolute paths in `nginx-comparison.conf` when using another checkout. Set `BENCHMARK_CHROME` for a different Chrome executable. Browser versions must match when reproducing a comparison.

Install measurement tools only:

```powershell
npm ci --prefix benchmarks/tooling --cache benchmarks/.npm-cache --ignore-scripts --no-audit --no-fund --offline=false
```

Choose a fresh result directory before a new run to preserve the recorded dataset:

```powershell
$env:BENCHMARK_RESULT_DIR = 'benchmarks/results/new-run'
node benchmarks/scripts/prepare.mjs
powershell -NoProfile -File benchmarks/scripts/environment.ps1
# Archives are made after measurements, using archive.mjs below.
wsl.exe -d Ubuntu -- nginx -t -c /mnt/c/Users/User001/r_site/benchmarks/nginx-comparison.conf
wsl.exe -d Ubuntu -- nginx -c /mnt/c/Users/User001/r_site/benchmarks/nginx-comparison.conf
```

`prepare.mjs` makes a bounded, sequential snapshot of selected public CRAN resources, with 250 ms between requests, a hard limit of 64 requests, no executable download, and source hashes. It saves response bodies without rewriting them. The original test snapshot can also be restored from `original-snapshot.tar.gz` in the recorded result directory. Do not replace the snapshot midway through tests.

Run each phase sequentially, with no load generator, Lighthouse or other browser benchmark running in parallel:

```powershell
node benchmarks/scripts/browser.mjs smoke
node benchmarks/scripts/browser.mjs pages
node benchmarks/scripts/http.mjs
node benchmarks/scripts/extras.mjs
# Pass the same result directory into the WSL process:
wsl.exe -d Ubuntu -- env BENCHMARK_RESULT_DIR=benchmarks/results/new-run node /mnt/c/Users/User001/r_site/benchmarks/scripts/load.mjs
node benchmarks/scripts/lighthouse.mjs
node benchmarks/scripts/summarize.mjs
node benchmarks/scripts/verify.mjs
node benchmarks/scripts/archive.mjs
node benchmarks/scripts/report.mjs
```

Main browser tests use ten runs per site/page/device/cache condition (400 observations). Lighthouse uses ten cold runs per site/page/device condition (200 audits), with a fresh Chrome process per audit, the pinned Lighthouse effective quiet windows (5250 ms for both profiles in DevTools throttling mode) and a 10000 ms FCP timeout. Both alternate site order. Detailed settings are stored in `browser-environment.json` and each Lighthouse report. `BENCHMARK_RUNS` and `BENCHMARK_LH_RUNS` override repeat counts. `repair` mode in the browser harness records the conservative replacements used for the 2026-10-28 dataset; it is not needed in a clean sequential rerun.

The load generator has hard-coded loopback targets and refuses public targets. It uses three 5-second intervals for each of 1, 10 and 50 concurrent clients. All intervals are sequential, use keep-alive and gzip, prime the filesystem cache, and sample Nginx CPU/RSS at 100 ms. It is a small Node HTTP client, not a claim to implement wrk's full methodology. The client and server share WSL CPU and memory; inspect client resource use as well as server use.

For the Windows scenario, CDP rebinds the original page's absolute CRAN CSS request to the same local snapshot. HTML/CSS bytes are preserved. Executable requests are intercepted and aborted. The public executable is validated once with HEAD, and binary transfer time is not compared.

Stop only the separate benchmark instance when finished:

```powershell
wsl.exe -d Ubuntu -- nginx -s stop -c /mnt/c/Users/User001/r_site/benchmarks/nginx-comparison.conf
```

The existing Nginx on port 8080 and global Nginx configuration are not changed. No build command is run while measuring. `verify.mjs` checks the entire `dist/` against its pre-test SHA-256 manifest.

## Replay the recorded page inputs

`archive.mjs` saves both the 16-file original corpus and the 10 candidate files needed for these page, search and navigation tests. The latter is a limited benchmark corpus, not a complete site release. `candidate-input-manifest.json` and `archives.json` preserve their SHA-256 hashes.

For exact input replay, use a separate copy of the recorded checkout. Restore `candidate-snapshot.tar.gz` into that copy's `dist/` and `original-snapshot.tar.gz` into `benchmarks/.cache/original/`. Adjust the two benchmark Nginx roots to the separate checkout. Do not unpack archives into the working build used during the original measurements.

Choose a fresh result directory, set `BENCHMARK_SOURCE_MANIFEST` to the recorded `source-manifest.json`, and initialize with `node benchmarks/scripts/prepare.mjs --reuse-snapshot`. That mode verifies source hashes without fetching CRAN again. Continue with environment capture and the serial measurement commands. Numeric timings will vary; keep Chrome, tooling, network/CPU settings and hardware consistent, and compare the recorded hashes first.

On the recorded host, npm initially inherited offline mode and an unreachable localhost proxy. Tool installation used `--offline=false --proxy=null --https-proxy=null` and empty `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` in that child shell only. Global proxy settings were not changed. A clean installation needs a working registry connection or the retained npm cache.

## 2026-10-29 investigation

See [PERFORMANCE_OPTIMIZATION.md](../PERFORMANCE_OPTIMIZATION.md). New results live
in `results/2026-10-29-optimization/`; the previous dataset is retained. The k6
executable on this machine is `C:\Program Files\k6\k6.exe`, outside PATH.
No extra measurement tools were installed.

For a fresh run, select a new result directory and pass the same variable into
WSL explicitly. Start the comparison instance as above, reusing its saved corpus.
The setup scripts are specific to this checkout and use dedicated temporary roots
and ports 8083/8084; run only one investigation at a time.

```powershell
$env:BENCHMARK_RESULT_DIR = 'benchmarks/results/my-new-investigation'
wsl.exe -d Ubuntu -- env BENCHMARK_RESULT_DIR=$env:BENCHMARK_RESULT_DIR sh /mnt/c/Users/User001/r_site/benchmarks/scripts/optimization-setup.sh
powershell -NoProfile -File benchmarks/scripts/optimization-load.ps1
wsl.exe -d Ubuntu -- env BENCHMARK_RESULT_DIR=$env:BENCHMARK_RESULT_DIR sh /mnt/c/Users/User001/r_site/benchmarks/scripts/optimization-ext4.sh
$env:BENCHMARK_RESULT_DIR = 'benchmarks/results/my-new-investigation/ext4'
$env:BENCHMARK_LOAD_PORTS = '8083,8084'
powershell -NoProfile -File benchmarks/scripts/optimization-load.ps1
```

After load testing finishes, restore the parent result directory and run browser
workloads serially: `browser.mjs pages`, `investigate.mjs`,
`optimization-ablation.mjs`, `optimization-lighthouse.mjs`, and
`optimization-qa.mjs`. `optimization-summary.mjs` summarizes browser and both load
series. New investigation scripts refuse existing result files. The inherited
`browser.mjs` itself overwrites its output: always use a fresh directory.

`optimization-validation.ps1` and `optimization-finalize.mjs` are the recorded
run's convenience scripts and contain its report/result paths. Do not rerun them
against the retained dataset. For another run execute `npm test`, `npm run build`,
and `npm run check:site` separately after measurements, and write a new report.
Check tmpfs/ext4 using `df -T`; never assume `/tmp` is disk-backed. Stop the
additional Nginx instance using its generated config and `nginx -s quit` when done.
