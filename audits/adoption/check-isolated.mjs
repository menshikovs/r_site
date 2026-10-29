import {readFileSync,writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {performance} from 'node:perf_hooks'
const source=readFileSync('scripts/check-site.mjs','utf8')
if(!source.includes("resolve('dist')")||!source.includes("'../src/cran-data.mjs'"))throw Error('Checker source changed; adapt the isolated harness')
const adapted=source.replace("resolve('dist')","resolve('audits/adoption/.cache/generated')").replace("'../src/cran-data.mjs'",JSON.stringify(pathToFileURL(resolve('src/cran-data.mjs')).href))
const start=performance.now()
await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64'))
writeFileSync('audits/adoption/2026-10-29/check-result.json',JSON.stringify({elapsedMs:performance.now()-start,passed:true,scope:'Unchanged site checker with only output root and absolute import adjusted; production files not modified'},null,2))
