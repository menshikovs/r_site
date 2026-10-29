$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$resultName = if ($env:BENCHMARK_RESULT_DIR) { $env:BENCHMARK_RESULT_DIR } else { 'benchmarks/results/2026-10-28' }
$resultDir = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $resultName))
New-Item -ItemType Directory -Force -Path $resultDir | Out-Null
$systemInfo = Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model,NumberOfLogicalProcessors,TotalPhysicalMemory
$processorInfo = Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors
Push-Location $projectRoot
try {
    @{ system=$systemInfo; processor=$processorInfo; revision=(git rev-parse HEAD) } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $resultDir 'environment-windows.json') -Encoding utf8
    wsl.exe -d Ubuntu -- bash -lc 'nginx -V 2>&1; uname -srvmo; cat /etc/os-release; node --version; free -b; nproc; getconf CLK_TCK' | Set-Content -LiteralPath (Join-Path $resultDir 'environment-wsl.txt') -Encoding utf8
    node benchmarks/scripts/public-host.mjs
} finally { Pop-Location }
