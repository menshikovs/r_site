// Closed-loop, local-only HTTP load generator. No public-host option exists.
import http from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { join } from 'node:path'
import { output } from './prepare.mjs'

if (process.platform !== 'linux') throw Error('Run inside the Ubuntu WSL instance hosting Nginx')
const sites = { original: 'http://127.0.0.1:8081', redesign: 'http://127.0.0.1:8082' }
const paths = ['/', '/bin/windows/', '/web/packages/', '/web/packages/ggplot2/index.html', '/manuals.html']
const clockTicks = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }))
const master = Number(readFileSync('/tmp/cran-comparison-nginx.pid', 'utf8').trim())
const quantile = (values, p) => { const a = [...values].sort((a,b) => a-b), at = (a.length-1)*p, i = Math.floor(at); return a.length ? a[i] + (a[Math.ceil(at)] - a[i]) * (at-i) : null }
function state() {
  const ids = [master], stats = []
  for (const id of ids) {
    try {
      ids.push(...readFileSync(`/proc/${id}/task/${id}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number))
      const raw = readFileSync(`/proc/${id}/stat`, 'utf8').split(') ').at(-1).split(' ')
      const status = readFileSync(`/proc/${id}/status`, 'utf8')
      stats.push({ id, ticks: Number(raw[11]) + Number(raw[12]), rssBytes: Number(/^VmRSS:\s+(\d+)/m.exec(status)?.[1] || 0) * 1024 })
    } catch {}
  }
  const cpu = readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number)
  const memory = readFileSync('/proc/meminfo', 'utf8')
  return { at: performance.now(), nginxTicks: stats.reduce((n,s) => n+s.ticks,0), nginxRssBytes: stats.reduce((n,s) => n+s.rssBytes,0), clientRssBytes: process.memoryUsage().rss, hostTicks: cpu.reduce((a,b) => a+b,0), hostIdleTicks: cpu[3]+cpu[4], availableBytes: Number(/^MemAvailable:\s+(\d+)/m.exec(memory)?.[1] || 0)*1024, processes: stats }
}
async function request(origin, path, agent) {
  const url = new URL(path, origin)
  if (url.hostname !== '127.0.0.1' || !['8081','8082'].includes(url.port)) throw Error('Non-local load target refused')
  const start = performance.now()
  return new Promise(resolve => {
    const req = http.get(url, { agent, headers: { 'Accept-Encoding': 'gzip' } }, response => {
      let bytes = 0
      response.on('data', chunk => { bytes += chunk.length })
      response.on('end', () => resolve({ path, status: response.statusCode, ms: performance.now()-start, bytes, encoding: response.headers['content-encoding'] || 'identity', cacheControl: response.headers['cache-control'], etag: response.headers.etag }))
      response.on('error', e => resolve({ path, error: e.message, ms: performance.now()-start, bytes }))
    })
    req.setTimeout(5000, () => req.destroy(Error('timeout')))
    req.on('error', e => resolve({ path, error: e.message, ms: performance.now()-start, bytes: 0 }))
  })
}
const results = []
for (let run = 0; run < 3; run++) for (const concurrency of [1,10,50]) for (const site of (run + concurrency) % 2 ? ['original','redesign'] : ['redesign','original']) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency, maxFreeSockets: concurrency })
  let socketsOpened = 0
  const connect = agent.createConnection.bind(agent)
  agent.createConnection = (...args) => { socketsOpened++; return connect(...args) }
  for (const path of paths) await request(sites[site], path, agent)
  const initial = state(), clientCpu = process.cpuUsage(), samples = [initial], responses = []
  let sequence = 0, halted = null
  const start = performance.now(), deadline = start+5000
  const monitor = setInterval(() => { const s = state(); samples.push(s); if (s.availableBytes < 512*1024*1024) halted = 'Low WSL available memory' }, 100)
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (performance.now() < deadline && !halted) responses.push(await request(sites[site], paths[sequence++ % paths.length], agent))
  }))
  const elapsedMs = performance.now()-start, final = state(), usedCpu = process.cpuUsage(clientCpu)
  clearInterval(monitor); samples.push(final); agent.destroy()
  const bytes = responses.reduce((n,r) => n+r.bytes,0), hostBusy = 100*(1-(final.hostIdleTicks-initial.hostIdleTicks)/(final.hostTicks-initial.hostTicks))
  const record = { site, concurrency, run, date: new Date().toISOString(), elapsedMs, requests: responses.length, requestsPerSecond: responses.length/(elapsedMs/1000), bodyBytes: bytes, bodyBytesPerSecond: bytes/(elapsedMs/1000), latencyMs: Object.fromEntries([['p50',.5],['p95',.95],['p99',.99]].map(([name,p]) => [name,quantile(responses.map(r => r.ms),p)])), httpErrors: responses.filter(r => r.error || r.status !== 200).length, nginxCpuOneCorePercent: 100*((final.nginxTicks-initial.nginxTicks)/clockTicks)/(elapsedMs/1000), nginxPeakSummedRssBytes: Math.max(...samples.map(s=>s.nginxRssBytes)), clientCpuOneCorePercent: 100*((usedCpu.user+usedCpu.system)/1e6)/(elapsedMs/1000), clientPeakRssBytes: Math.max(...samples.map(s=>s.clientRssBytes)), hostBusyPercent: hostBusy, minimumAvailableBytes: Math.min(...samples.map(s=>s.availableBytes)), halted, samples, responses }
  record.socketsOpened = socketsOpened
  results.push(record); writeFileSync(join(output, 'load.json'), JSON.stringify({ clockTicks, paths, durationSeconds:5, repeats:3, model:'Closed loop; keep-alive; gzip; no client HTTP cache; filesystem primed; 100%=one CPU core; RSS sums include shared pages.', results }))
  console.log(`${site} c=${concurrency} run=${run+1}: ${record.requestsPerSecond.toFixed(1)} req/s p95=${record.latencyMs.p95.toFixed(2)}ms nginxCPU=${record.nginxCpuOneCorePercent.toFixed(1)}% errors=${record.httpErrors}`)
  await new Promise(r => setTimeout(r,500))
}
