$ErrorActionPreference = 'Continue'
$env:BENCHMARK_RESULT_DIR = 'benchmarks/results/2026-10-29-optimization'
$resultDir = $env:BENCHMARK_RESULT_DIR
if (Test-Path "$resultDir/lighthouse-current-summary.json") { throw 'This recorded-run helper requires fresh outputs; do not overwrite the retained dataset' }
$status = @()
node benchmarks/scripts/optimization-lighthouse.mjs 2>&1 | Tee-Object -FilePath "$resultDir/lighthouse-console.txt"
$status += @{ command='optimization-lighthouse'; exitCode=$LASTEXITCODE }
node benchmarks/scripts/optimization-qa.mjs 2>&1 | Tee-Object -FilePath "$resultDir/qa-console.txt"
$status += @{ command='optimization-qa'; exitCode=$LASTEXITCODE }
npm.cmd test 2>&1 | Tee-Object -FilePath "$resultDir/validation-test.txt"
$status += @{ command='npm test'; exitCode=$LASTEXITCODE }
npm.cmd run build 2>&1 | Tee-Object -FilePath "$resultDir/validation-build.txt"
$status += @{ command='npm run build'; exitCode=$LASTEXITCODE }
npm.cmd run check:site 2>&1 | Tee-Object -FilePath "$resultDir/validation-check-site.txt"
$status += @{ command='npm run check:site'; exitCode=$LASTEXITCODE }
$status | ConvertTo-Json | Set-Content -LiteralPath "$resultDir/validation-status.json" -Encoding utf8
