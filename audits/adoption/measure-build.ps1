$ErrorActionPreference='Stop'
$out='audits/adoption/2026-10-29'
New-Item -ItemType Directory -Force $out | Out-Null
if(Test-Path "$out/build-result.json"){throw 'Recorded build exists; use a fresh directory'}
$nodePath=(Get-Command node).Source
$process=Start-Process -FilePath $nodePath -ArgumentList 'audits/adoption/build-isolated.mjs' -WindowStyle Hidden -PassThru -RedirectStandardOutput "$out/build-stdout.txt" -RedirectStandardError "$out/build-stderr.txt"
$null=$process.Handle
$tracked=@{};$samples=@();$watch=[System.Diagnostics.Stopwatch]::StartNew()
while(-not $process.HasExited){
  $all=Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name
  $ids=@([int]$process.Id)
  do{$added=@($all | Where-Object {([int]$_.ParentProcessId -in $ids) -and ([int]$_.ProcessId -notin $ids)} | ForEach-Object {[int]$_.ProcessId});$ids+=$added}while($added.Count)
  $live=@()
  foreach($id in $ids){
    $p=Get-Process -Id $id -ErrorAction SilentlyContinue
    if($p){
      $v=@{pid=$id;name=$p.ProcessName;cpuMs=$p.TotalProcessorTime.TotalMilliseconds;workingSet=$p.WorkingSet64;peakWorkingSet=$p.PeakWorkingSet64;privateBytes=$p.PrivateMemorySize64}
      $live+=$v;$tracked[$id]=$v
    }
  }
  $samples+=@{elapsedMs=$watch.Elapsed.TotalMilliseconds;processes=$live}
  Start-Sleep -Milliseconds 500
  $process.Refresh()
}
$process.WaitForExit();$watch.Stop()
@{exitCode=$process.ExitCode;wallMs=$watch.Elapsed.TotalMilliseconds;sampleIntervalMs=500;method='Descendant discovery through Win32_Process; sampled summed working sets may double count shared pages; final child CPU is a lower bound if exit occurs between samples';lastProcessSamples=@($tracked.Values);samples=$samples} | ConvertTo-Json -Depth 7 | Set-Content "$out/build-resources.json" -Encoding utf8
if($process.ExitCode -ne 0){throw 'Isolated build failed; see logs'}
Write-Output 'Isolated full build completed; production dist unchanged'
