import {fetchCranData,buildSite} from '../../scripts/build.mjs'
import {writeFileSync,mkdirSync} from 'node:fs'
import {performance} from 'node:perf_hooks'
const out='audits/adoption/2026-10-29'
mkdirSync(out,{recursive:true})
process.env.CRAN_BUILD_AUDIT_DIR=out+'/inputs'
const start=performance.now(),cpu=process.cpuUsage()
const inputs=await fetchCranData(),fetched=performance.now()
console.log('ISOLATED_GENERATION_START')
const result=buildSite({...inputs,outDir:'audits/adoption/.cache/generated'})
writeFileSync(out+'/build-result.json',JSON.stringify({result,wallMs:performance.now()-start,acquisitionAndExportMs:fetched-start,generationAndPublishMs:performance.now()-fetched,nodeCpu:process.cpuUsage(cpu),nodeMemory:process.memoryUsage(),scope:'Existing full build functions; separate outDir; production dist is never replaced.'},null,2))
console.log('ISOLATED_BUILD_DONE',JSON.stringify(result))
