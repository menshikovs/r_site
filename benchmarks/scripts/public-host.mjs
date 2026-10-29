import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { output } from './prepare.mjs'
let data
try {
  const response=await fetch('https://api.github.com/repos/menshikovs/r_site',{signal:AbortSignal.timeout(10000)})
  if(!response.ok)throw Error('GitHub HTTP '+response.status)
  const x=await response.json()
  data={checkedAt:new Date().toISOString(),repository:'menshikovs/r_site',homepage:x.homepage,has_pages:x.has_pages,conclusion:'No candidate URL was supplied; repository metadata alone cannot rule out a public deployment elsewhere.'}
}catch(error){data={checkedAt:new Date().toISOString(),error:error.message}}
mkdirSync(output,{recursive:true});writeFileSync(join(output,'public-host-check.json'),JSON.stringify(data,null,2))
