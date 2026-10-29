$ErrorActionPreference = 'Stop'
$resultName = if ($env:BENCHMARK_RESULT_DIR) { $env:BENCHMARK_RESULT_DIR } else { 'benchmarks/results/2026-10-29-optimization' }
$resultDir = [System.IO.Path]::GetFullPath($resultName)
New-Item -ItemType Directory -Force -Path $resultDir | Out-Null
if ((Test-Path (Join-Path $resultDir 'monitor-comparison.jsonl')) -or (Test-Path (Join-Path $resultDir 'load-resource-windows.json'))) { throw 'Choose a fresh BENCHMARK_RESULT_DIR; recorded results will not be overwritten' }
$k6Path = 'C:\Program Files\k6\k6.exe'
$monitors = @()
foreach ($kind in @('comparison', 'optimization')) {
    $log = Join-Path $resultDir "monitor-$kind.jsonl"
    $errLog = Join-Path $resultDir "monitor-$kind.stderr.txt"
    $monitors += Start-Process -FilePath wsl.exe -ArgumentList @('-d','Ubuntu','--','node','/mnt/c/Users/User001/r_site/benchmarks/scripts/optimization-monitor.mjs',"/tmp/cran-$kind-nginx.pid",'600000') -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError $errLog
}
$records = @()
try {
    for ($repeat = 0; $repeat -lt 3; $repeat++) {
        foreach ($clients in @(1,10,25,50)) {
            $selectedPorts = if ($env:BENCHMARK_LOAD_PORTS) { @($env:BENCHMARK_LOAD_PORTS.Split(',') | ForEach-Object { [int]$_ }) } else { @(8081,8082,8083,8084) }
            if (@($selectedPorts | Where-Object { $_ -notin @(8081,8082,8083,8084) }).Count) { throw 'Only local benchmark ports are allowed' }
            $ports = if ($repeat % 2 -eq 0) { $selectedPorts } else { @($selectedPorts | Sort-Object -Descending) }
            foreach ($port in $ports) {
                $id = "k6-$port-c$clients-r$repeat"
                if (Test-Path (Join-Path $resultDir "$id.json")) { throw "Refusing to overwrite $id.json; choose a fresh BENCHMARK_RESULT_DIR" }
                foreach ($path in @('/','/bin/windows/','/web/packages/','/web/packages/ggplot2/index.html','/manuals.html')) {
                    Invoke-WebRequest -Uri "http://127.0.0.1:$port$path" -UseBasicParsing | Out-Null
                }
                $args = @('run','--quiet','--address','127.0.0.1:0','--env',"TARGET=http://127.0.0.1:$port",'--env',"CLIENTS=$clients",'--env',"SUMMARY=$resultName/$id.json",'benchmarks/scripts/optimization-k6.js')
                $started = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                $process = Start-Process -FilePath $k6Path -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $resultDir "$id.stdout.txt") -RedirectStandardError (Join-Path $resultDir "$id.stderr.txt")
                $null = $process.Handle
                $samples = @()
                while (-not $process.HasExited) {
                    $process.Refresh()
                    if (-not $process.HasExited) {
                        $samples += @{ at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); cpuMs=$process.TotalProcessorTime.TotalMilliseconds; workingSet=$process.WorkingSet64 }
                    }
                    Start-Sleep -Milliseconds 100
                }
                $process.WaitForExit()
                if (($null -ne $process.ExitCode -and $process.ExitCode -ne 0) -or -not (Test-Path (Join-Path $resultDir "$id.json"))) { throw "k6 failed for $id (exit $($process.ExitCode))" }
                $records += @{ id=$id; port=$port; clients=$clients; repeat=$repeat; start=$started; end=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); samples=$samples }
                $records | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $resultDir 'load-resource-windows.json') -Encoding utf8
                Write-Output "$id completed"
            }
        }
    }
} finally {
    foreach ($kind in @('comparison', 'optimization')) {
        $first = Get-Content (Join-Path $resultDir "monitor-$kind.jsonl") -TotalCount 1 | ConvertFrom-Json
        wsl.exe -d Ubuntu -- kill -TERM $first.monitorPid
    }
    foreach ($monitor in $monitors) { $monitor.WaitForExit() }
}
