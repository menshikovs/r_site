import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'
const read = path => JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
const lines = path => readFileSync(path,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(JSON.parse)
const q = (values,p=.5) => { const a=values.filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b); if(!a.length)return null;const at=(a.length-1)*p,i=Math.floor(at); return a[i]+(a[Math.ceil(at)]-a[i])*(at-i) }
const browserMetrics=['fcpMs','lcpMs','cls','dclMs','transferredBytes','requests','LayoutDurationMs','RecalcStyleDurationMs']
function browserGroups(path) {
  const groups={}
  for(const row of lines(path)) {
    const key=[row.site,row.profile,row.cache,row.page].join('/')
    ;(groups[key] ||= []).push(row)
  }
  return Object.entries(groups).map(([key,rows])=>({key,n:rows.length,errors:rows.filter(r=>r.error).length,metrics:Object.fromEntries(browserMetrics.map(k=>[k,{n:rows.filter(r=>Number.isFinite((r.cpu||{})[k]??r[k])&&((r.cpu||{})[k]??r[k])>=0).length,p50:q(rows.map(r=>(r.cpu||{})[k]??r[k])),p95:q(rows.map(r=>(r.cpu||{})[k]??r[k]),.95)}]))}))
}
function loadGroups(dir,filesystem) {
  const resources=read(join(dir,'load-resource-windows.json'))
  const monitor={}
  for(const kind of ['comparison','optimization']) monitor[kind]=lines(join(dir,`monitor-${kind}.jsonl`)).filter(x=>x.at)
  const rows=resources.map(r=> {
    const m=read(join(dir,`${r.id}.json`)).metrics
    const samples=monitor[r.port<8083?'comparison':'optimization'].filter(s=>s.at>=r.start&&s.at<=r.end)
    const ticks=s=>s.processes.reduce((n,p)=>n+p.ticks,0)
    const a=samples[0],b=samples.at(-1)
    const first=r.samples[0],last=r.samples.at(-1)
    return {id:r.id,site:r.port%2?'original':'redesign',filesystem:r.port<8083?'DrvFS':filesystem,clients:r.clients,repeat:r.repeat,
      responsesPerSecond:m.successful_responses.values.rate,attemptsPerSecond:m.http_reqs.values.rate,attempts:m.http_reqs.values.count,
      p50:m.http_req_duration.values.med,p95:m.http_req_duration.values['p(95)'],p99:m.http_req_duration.values['p(99)'],attemptElapsedP99:m.attempt_elapsed.values['p(99)'],
      httpErrors:m.http_status_errors.values.count,timeouts:m.client_timeouts.values.count,transportErrors:m.transport_errors.values.count,
      nginxCpu:a&&b?1000*(ticks(b)-ticks(a))/(b.at-a.at):null,nginxPeakMiB:q(samples.map(s=>s.processes.reduce((n,p)=>n+p.rss,0)),1)/2**20,
      clientCpu:first&&last?100*(last.cpuMs-first.cpuMs)/(last.at-first.at):null,clientPeakMiB:q(r.samples.map(s=>s.workingSet),1)/2**20,
      minimumAvailableGiB:q(samples.map(s=>s.availableKiB/2**20),0),samples:samples.length }
  })
  return rows
}
const result={date:'2026-10-29',quantiles:'Type 7; load group quantiles are medians of three per-interval quantiles, not pooled percentiles.'}
if(existsSync(join(output,'browser.jsonl'))) {
  result.browser=browserGroups(join(output,'browser.jsonl'))
  result.previousBrowser=browserGroups('benchmarks/results/2026-10-28/browser.jsonl')
}
result.load=[...loadGroups(output,'tmpfs'),...(existsSync(join(output,'ext4/load-resource-windows.json'))?loadGroups(join(output,'ext4'),'ext4'):[])]
const groups={}
for(const row of result.load)(groups[[row.filesystem,row.site,row.clients].join('/')] ||= []).push(row)
result.loadGroups=Object.entries(groups).map(([key,rows])=>({key,n:rows.length,...Object.fromEntries(['responsesPerSecond','p50','p95','p99','nginxCpu','clientCpu'].map(k=>[k,q(rows.map(r=>r[k]))])),httpErrors:rows.reduce((n,r)=>n+r.httpErrors,0),timeouts:rows.reduce((n,r)=>n+r.timeouts,0),transportErrors:rows.reduce((n,r)=>n+r.transportErrors,0),nginxPeakMiB:q(rows.map(r=>r.nginxPeakMiB),1),clientPeakMiB:q(rows.map(r=>r.clientPeakMiB),1),minimumAvailableGiB:q(rows.map(r=>r.minimumAvailableGiB),0)}))
if(existsSync(join(output,'ablation.json'))) {
  const groups={}
  for(const row of read(join(output,'ablation.json')).rows)(groups[`${row.name}/${row.variant}`] ||= []).push(row)
  result.ablation=Object.entries(groups).map(([key,rows])=>({key,layoutMs:q(rows.map(r=>r.layoutMs)),styleMs:q(rows.map(r=>r.styleMs))}))
}
writeFileSync(join(output,'optimization-summary.json'),JSON.stringify(result,null,2))
const table=result.loadGroups.map(r=>`| ${r.key} | ${r.responsesPerSecond.toFixed(1)} | ${r.p50.toFixed(2)} / ${r.p95.toFixed(2)} / ${r.p99.toFixed(2)} | ${r.httpErrors} / ${r.timeouts} | ${r.nginxCpu.toFixed(1)} / ${r.nginxPeakMiB.toFixed(1)} | ${r.clientCpu.toFixed(1)} / ${r.clientPeakMiB.toFixed(1)} |`).join('\n')
writeFileSync(join(output,'load-table.md'),table+'\n')
console.log(table)
