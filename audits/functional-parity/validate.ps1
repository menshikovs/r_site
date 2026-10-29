$ErrorActionPreference = 'Continue'
$root = 'audits/functional-parity/2026-10-29'
$status = @()
npm.cmd test 2>&1 | Tee-Object -FilePath "$root/test-log.txt"
$status += @{command='npm test';exitCode=$LASTEXITCODE}
& 'C:\Program Files\R\R-4.5.2\bin\Rscript.exe' tests/export-cran-data.R 2>&1 | Tee-Object -FilePath "$root/r-test-log.txt"
$status += @{command='R export regression';exitCode=$LASTEXITCODE}
$watch = [System.Diagnostics.Stopwatch]::StartNew()
$generationStart = $null
npm.cmd run build 2>&1 | ForEach-Object {
    if ("$_" -match '^Generating static HTML') { $generationStart = $watch.Elapsed.TotalMilliseconds }
    $_
} | Tee-Object -FilePath "$root/build-log.txt"
$buildExit = $LASTEXITCODE
$watch.Stop()
$status += @{command='npm run build';exitCode=$buildExit}
@{elapsedMs=$watch.Elapsed.TotalMilliseconds;generationAndPublishMs=if ($null -ne $generationStart) {$watch.Elapsed.TotalMilliseconds-$generationStart} else {$null};includesNetwork=$true;exitCode=$buildExit} | ConvertTo-Json | Set-Content -LiteralPath "$root/build-timing.json" -Encoding utf8
npm.cmd run check:site 2>&1 | Tee-Object -FilePath "$root/check-site-log.txt"
$status += @{command='npm run check:site';exitCode=$LASTEXITCODE}
$status | ConvertTo-Json | Set-Content -LiteralPath "$root/validation-status.json" -Encoding utf8
