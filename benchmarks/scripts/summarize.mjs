import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { output, project, snapshot } from './prepare.mjs'

export const quantile = (values, p) => {
  const a = values.filter(Number.isFinite).sort((a,b) => a-b)
  if (!a.length) return null
  const at = (a.length-1)*p, i = Math.floor(at)
  return a[i] + (a[Math.ceil(at)]-a[i])*(at-i)
}
export const stats = values => ({ n: values.filter(Number.isFinite).length, p50: quantile(values,.5), p75: quantile(values,.75), p95: quantile(values,.95), min: quantile(values,0), max: quantile(values,1) })
export const read = name => JSON.parse(readFileSync(join(output, name), 'utf8').replace(/^\uFEFF/, ''))
const rows = readFileSync(join(output, 'browser.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
const keys = ['ttfbMs','fcpMs','lcpMs','dclMs','loadMs','cls','longTaskMs','longTaskMaxMs','transferredBytes','requests','networkRequests','cacheHits','htmlBytes','cssBytes','jsBytes','jsHeapUsedBytes']
const groups = new Map()
for (const row of rows) {
  const key = [row.profile,row.cache,row.page,row.site].join('/')
  if (!groups.has(key)) groups.set(key,[])
  groups.get(key).push(row)
}
const summary = []
for (const [key, list] of groups) {
  const [profile,cache,page,site] = key.split('/')
  const result = { profile,cache,page,site,n:list.length,errors:list.filter(x=>x.error).length,metrics:{} }
  for (const k of keys) result.metrics[k] = stats(list.map(x=>x[k]))
  for (const k of ['TaskDurationMs','ScriptDurationMs','LayoutDurationMs','RecalcStyleDurationMs']) result.metrics[k] = stats(list.map(x=>x.cpu?.[k]>=0?x.cpu[k]:null))
  for (const k of ['fcpMs','lcpMs']) result.metrics['banner'+k] = stats(list.map(x=>{ const banner=x.frames?.find(f=>f.name==='banner'); return banner && Number.isFinite(banner[k]) ? banner.timeOrigin-x.timeOrigin+banner[k] : null }))
  result.thirdParty = [...new Set(list.flatMap(x=>x.thirdParty||[]))]
  result.failures = list.flatMap(x=>x.failures||[])
  summary.push(result)
}
const payloads = []
for (const page of ['home','windows','catalog','ggplot2','manuals']) for (const site of ['original','redesign']) {
  const row = rows.find(x=>x.profile==='desktop'&&x.cache==='cold'&&x.page===page&&x.site===site)
  const root = site==='original'?snapshot:join(project,'dist')
  const size = url => { let path=new URL(url).pathname; if(path.endsWith('/'))path+='index.html'; try{return readFileSync(join(root,decodeURIComponent(path))).length}catch{return null} }
  const unique = [...new Map(row.network.map(r=>[r.url,r])).values()]
  const med=summary.find(r=>r.profile==='desktop'&&r.cache==='cold'&&r.page===page&&r.site===site).metrics
  payloads.push({page,site,mainHtmlBytes:size(row.url),allHtmlBytes:unique.filter(r=>r.type==='Document').reduce((n,r)=>n+(size(r.url)||0),0),uniqueCssBytes:unique.filter(r=>r.type==='Stylesheet').reduce((n,r)=>n+(size(r.url)||0),0),uniqueJsBytes:unique.filter(r=>r.type==='Script').reduce((n,r)=>n+(size(r.url)||0),0),logicalRequests:med.requests.p50,networkRequests:med.networkRequests.p50,wireBytes:med.transferredBytes.p50,textCharacters:row.textCharacters,links:row.links,frames:row.frames.length})
}
const searchGroups = [], scenarioGroups = []
for (const profile of ['desktop','mobile']) {
  for (const cache of ['first','repeat']) { const list=read('search.json').filter(r=>r.profile===profile&&r.cache===cache); searchGroups.push({profile,cache,n:list.length,time:stats(list.map(r=>r.ms)),requests:stats(list.map(r=>r.requests)),encodedBytes:stats(list.map(r=>r.encodedBytes)),decodedBytes:stats(list.map(r=>r.decodedBytes)),resultNames:list[0]?.resultNames}) }
  for (const site of ['original','redesign']) { const list=read('scenarios.json').filter(r=>r.profile===profile&&r.site===site); scenarioGroups.push({profile,site,n:list.length,time:stats(list.map(r=>r.totalToDownloadRequestMs)),clicks:list[0]?.clicks,download:list[0]?.download,blocked:list.flatMap(x=>x.blocked),rebinding:list.flatMap(x=>x.rebinding)}) }
}
const load = read('load.json'), loadGroups=[]
for(const concurrency of [1,10,50])for(const site of ['original','redesign']) {
  const list=load.results.filter(r=>r.concurrency===concurrency&&r.site===site), responses=list.flatMap(r=>r.responses)
  const finished = responses.filter(r=>Number.isFinite(r.status)), lat = list => Object.fromEntries([['p50',.5],['p95',.95],['p99',.99]].map(([k,p])=>[k,quantile(list.map(r=>r.ms),p)]))
  loadGroups.push({site,concurrency,intervals:list.length,rps:stats(list.map(r=>r.responses.filter(x=>Number.isFinite(x.status)).length/(r.elapsedMs/1000))),completedAttemptRate:stats(list.map(r=>r.requestsPerSecond)),throughput:stats(list.map(r=>r.bodyBytesPerSecond)),latency:lat(finished),allAttemptLatency:lat(responses),requests:responses.length,httpResponses:finished.length,httpErrors:finished.filter(r=>r.status!==200).length,timeouts:responses.filter(r=>r.error==='timeout').length,errors:list.reduce((n,r)=>n+r.httpErrors,0),nginxCpu:stats(list.map(r=>r.nginxCpuOneCorePercent)),nginxPeakRssBytes:Math.max(...list.map(r=>r.nginxPeakSummedRssBytes)),clientCpu:stats(list.map(r=>r.clientCpuOneCorePercent)),clientPeakRssBytes:Math.max(...list.map(r=>r.clientPeakRssBytes)),hostCpu:stats(list.map(r=>r.hostBusyPercent)),minimumAvailableBytes:Math.min(...list.map(r=>r.minimumAvailableBytes)),socketsOpened:list.map(r=>r.socketsOpened),halted:list.filter(r=>r.halted)})
}
const invalidCpuDeltas=rows.flatMap(r=>Object.entries(r.cpu||{}).filter(([,value])=>value<0).map(([counter,value])=>({site:r.site,page:r.page,profile:r.profile,cache:r.cache,run:r.run,counter,value,reason:'Negative instrumentation delta omitted from this counter only; raw observation retained.'})))
const result={generatedAt:new Date().toISOString(),browserSamples:rows.length,groups:summary,payloads,search:searchGroups,scenarios:scenarioGroups,load:loadGroups,lighthouse:read('lighthouse-summary.json'),nojs:read('nojs.json'),invalidCpuDeltas}
writeFileSync(join(output,'invalid-cpu-deltas.json'),JSON.stringify(invalidCpuDeltas,null,2))
writeFileSync(join(output,'summary.json'),JSON.stringify(result,null,2))
const columns=['profile','cache','page','site','n',...Object.keys(summary[0].metrics).flatMap(k=>['n','p50','p75','p95','min','max'].map(q=>`${k}.${q}`))]
const csv=[columns.join(','),...summary.map(r=>columns.map(k=>k.includes('.')?r.metrics[k.split('.')[0]][k.split('.')[1]]??'':r[k]).join(','))].join('\n')+'\n'
writeFileSync(join(output,'browser-summary.csv'),csv)
console.log(JSON.stringify({samples:result.browserSamples,groups:summary.length,load:loadGroups.map(({site,concurrency,rps,latency,errors,nginxCpu})=>({site,concurrency,rps:rps.p50,latency,errors,nginxCpu:nginxCpu.p50})),lighthouse:result.lighthouse.map(r=>({profile:r.profile,page:r.page,site:r.site,score:r.score,error:r.error||r.runtimeError?.code}))},null,2))
