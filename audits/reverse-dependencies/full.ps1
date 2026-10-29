$ErrorActionPreference='Stop'
$out='audits/reverse-dependencies/2026-10-29'
if (-not (Test-Path "$out/prototype-browser.json")) {throw 'Prototype browser validation must run first'}
if (Test-Path "$out/full/build-timing.json") {throw 'Use a fresh output directory; measurements already exist'}
. "$PSScriptRoot/disk.ps1"
Measure-ReverseDisk 'dist' | ConvertTo-Json | Set-Content "$out/disk-before.json" -Encoding utf8
New-Item -ItemType Directory -Force "$out/full" | Out-Null
$env:CRAN_BUILD_AUDIT_DIR="$out/full"
# Three times the reviewed upper estimate (~64 MiB), checked before publication.
$env:CRAN_BUILD_MAX_ADDED_BYTES='201326592'
$ErrorActionPreference='Continue'
$status=@()
npm.cmd test 2>&1 | Tee-Object "$out/full/test-log.txt"
$status+=@{command='npm test';exitCode=$LASTEXITCODE}
& 'C:\Program Files\R\R-4.5.2\bin\Rscript.exe' tests/export-cran-data.R 2>&1 | Tee-Object "$out/full/r-test-log.txt"
$status+=@{command='Rscript tests/export-cran-data.R';exitCode=$LASTEXITCODE}
if (@($status | Where-Object {$_.exitCode -ne 0}).Count) {throw 'Tests failed before full build'}
$watch=[System.Diagnostics.Stopwatch]::StartNew();$generationStart=$null
npm.cmd run build 2>&1 | ForEach-Object {if ("$_" -match '^Generating static HTML') {$generationStart=$watch.Elapsed.TotalMilliseconds};$_} | Tee-Object "$out/full/build-log.txt"
$buildExit=$LASTEXITCODE;$watch.Stop()
$status+=@{command='npm run build';exitCode=$buildExit}
@{elapsedMs=$watch.Elapsed.TotalMilliseconds;generationAndPublishMs=if($null -ne $generationStart){$watch.Elapsed.TotalMilliseconds-$generationStart}else{$null};includesNetwork=$true;exitCode=$buildExit} | ConvertTo-Json | Set-Content "$out/full/build-timing.json" -Encoding utf8
if ($buildExit -ne 0) {throw 'Build failed; inspect retained snapshot and prototype'}
$check=[System.Diagnostics.Stopwatch]::StartNew()
npm.cmd run check:site 2>&1 | Tee-Object "$out/full/check-log.txt"
$checkExit=$LASTEXITCODE;$check.Stop()
$status+=@{command='npm run check:site';exitCode=$checkExit}
@{elapsedMs=$check.Elapsed.TotalMilliseconds;exitCode=$checkExit} | ConvertTo-Json | Set-Content "$out/full/check-timing.json" -Encoding utf8
$status | ConvertTo-Json | Set-Content "$out/full/status.json" -Encoding utf8
Measure-ReverseDisk 'dist' | ConvertTo-Json | Set-Content "$out/disk-after.json" -Encoding utf8
Remove-Item Env:CRAN_BUILD_AUDIT_DIR
Remove-Item Env:CRAN_BUILD_MAX_ADDED_BYTES
