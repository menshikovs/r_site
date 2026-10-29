import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {portableHtml} from '../../src/static-urls.mjs'
import {annotateArchivedProvenance} from './archived-html.mjs'
const manifest=JSON.parse(readFileSync(new URL('./2026-10-29/full-manifest.json',import.meta.url)))
const input='/var/tmp/cran-adoption-20261029/releases/r2',standalone=process.env.CRAN_NATIVE_MODE==='standalone',output='/var/tmp/cran-mirrors-20261029/'+(standalone?'check':'full')
for(const {path} of manifest.files){
  let bytes=path==='_headers' ? readFileSync(new URL('./.cache/full/_headers',import.meta.url)) : readFileSync(join(input,path))
  if(/\.html?$/i.test(path))bytes=Buffer.from(portableHtml(annotateArchivedProvenance(bytes.toString()),path,{mirrorResources:!standalone}))
  if(path==='assets/search.js')bytes=readFileSync(new URL('../../public/search.js',import.meta.url))
  mkdirSync(dirname(join(output,path)),{recursive:true});writeFileSync(join(output,path),bytes)
}
console.log('Wrote '+manifest.files.length+' generated files on native ext4')
