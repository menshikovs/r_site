import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'
const read=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
const data=read(join(output,'optimization-summary.json'))
let report=readFileSync('PERFORMANCE_OPTIMIZATION.md','utf8')
if(!report.includes('<!-- LOAD_TABLE -->'))throw Error('Report already finalized; refusing to insert duplicate tables')
const f=x=>x==null?'N/A':x.toFixed(1)
const old=Object.fromEntries(data.previousBrowser.map(r=>[r.key,r]))
const current=data.browser.filter(r=>r.key.startsWith('redesign/'))
const pair=(r,k)=>`${f(old[r.key]?.metrics[k].p50)} / ${f(r.metrics[k].p50)}`
let tables='### Repeated browser series: previous date / current date\n\n'
tables+='Each cell is a median of n=10. Units are ms except CLS. Summary JSON also retains p95 and valid counts. These tables do not establish a frontend-change effect: input bytes are identical.\n\n'
tables+='| Profile / cache / page | FCP previous / current | LCP previous / current | DCL previous / current | Current CLS |\n|---|---:|---:|---:|---:|\n'
for(const r of current)tables+=`| ${r.key.replace('redesign/','')} | ${pair(r,'fcpMs')} | ${pair(r,'lcpMs')} | ${pair(r,'dclMs')} | ${r.metrics.cls.p50} |\n`
tables+='\n| Profile / cache / page | Layout previous / current, ms | Style previous / current, ms | Current transferred B | Current requests |\n|---|---:|---:|---:|---:|\n'
for(const r of current)tables+=`| ${r.key.replace('redesign/','')} | ${pair(r,'LayoutDurationMs')} | ${pair(r,'RecalcStyleDurationMs')} | ${r.metrics.transferredBytes.p50} | ${r.metrics.requests.p50} |\n`
tables+='\nRequests are logical browser requests, including cache hits. All warm page trials have zero transfer; that does not mean zero logical requests. Negative/nonnumeric CPU deltas are excluded only from the corresponding counter summary; original rows are retained. Original pages were also remeasured; their 200 observations appear in the shared JSONL and summary.\n\n'
tables+='### Diagnostic CSS controls\n\nMedians of five mobile cold contexts per control. CSS interception is identical across controls, so their network FCP/LCP is not compared with the main series. `noGrid` breaks layout; `singleFont` replaces technical mono text with Arial. These attribute cost and are not acceptable frontend optimizations.\n\n| Page / control | Layout, ms | Style, ms |\n|---|---:|---:|\n'
for(const r of data.ablation)tables+=`| ${r.key} | ${f(r.layoutMs)} | ${f(r.styleMs)} |\n`
const lh=read(join(output,'lighthouse-current-summary.json'))
tables+="\n### Repeated Lighthouse audits\n\nRan one additional audit per page/profile/cache combination (20 audits), with a separate Chrome process per audit. This is a diagnostic repeat; the desired 10 repetitions were completed in the main browser series, **not** this Lighthouse series. A single score cannot establish sustained improvement. Previous redesign cold Lighthouse scores had median 100 in all 10 page/profile groups. The new warm audit first opens the page in the same process and preserves storage/cache; cold clears storage normally. Each LHR retains settings and network records; warm here concerns the main navigation pass's cache state, while the accessibility pass may load separately.\n\n| Profile / page / cache | Performance | Accessibility | FCP / LCP, ms | CLS |\n|---|---:|---:|---:|---:|\n"
for(const r of lh)tables+=`| ${r.profile}/${r.page}/${r.cache} | ${r.score==null?'N/A':100*r.score} | ${100*r.accessibility} | ${f(r.metrics['first-contentful-paint'])} / ${f(r.metrics['largest-contentful-paint'])} | ${r.metrics['cumulative-layout-shift']} |\n`
tables+='\nErrors and warnings are not hidden: see [Lighthouse summary](benchmarks/results/2026-10-29-optimization/lighthouse-current-summary.json). Contrast checking is limited to Lighthouse/axe coverage.\n'
report=report.replace('Numerical browser and Lighthouse tables follow after the series completes. Raw data:', 'Numerical browser and Lighthouse tables follow. Raw data:')
report=report.replace('## 4. Load experiment: methodology',tables+'\n## 4. Load experiment: methodology')
report=report.replace('<!-- LOAD_TABLE -->','| Filesystem / version / clients | Successful responses/s | p50 / p95 / p99, ms | HTTP errors / timeouts, total | Nginx CPU % / peak RSS MiB | k6 CPU % / peak working set MiB |\n|---|---:|---:|---:|---:|---:|\n'+readFileSync(join(output,'load-table.md'),'utf8'))
const qa=read(join(output,'functional-qa.json'))
report=report.replace('## 9. Future public HTTPS deployment',`Browser QA: **${qa.length} records without errors** in [functional-qa.json](benchmarks/results/2026-10-29-optimization/functional-qa.json). Screenshots retained for every page/width. Command results are in \`validation-*.txt\`; those logs describe build state.\n\n## 9. Future public HTTPS deployment`)
writeFileSync('PERFORMANCE_OPTIMIZATION.md',report)
console.log('Report populated with finalized measurements')
