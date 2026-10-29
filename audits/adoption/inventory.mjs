import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join,relative} from 'node:path'
import {validateOverlayPaths} from './policy.mjs'
const out='audits/adoption/2026-10-29'
const digest=b=>createHash('sha256').update(b).digest('hex')
const manifest=root=>{const files=[];function walk(dir){for(const n of readdirSync(dir).sort()){const p=join(dir,n);if(statSync(p).isDirectory())walk(p);else{const b=readFileSync(p);files.push({path:relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:digest(b)})}}}walk(root);return{files,totalBytes:files.reduce((n,f)=>n+f.bytes,0),sha256:digest(JSON.stringify(files))}}
const original=manifest('audits/adoption/.cache/original'),generated=manifest('audits/adoption/.cache/generated'),production=manifest('dist')
const source=Object.fromEntries(['src/templates.mjs','src/site.css','src/cran-data.mjs','scripts/build.mjs','scripts/export-cran-data.R','public/search.js','deploy/nginx-wsl.conf'].map(p=>[p,digest(readFileSync(p))]))
const originalMap=new Map(original.files.map(f=>[f.path,f]))
const collisions=generated.files.filter(f=>originalMap.has(f.path)).map(f=>({path:f.path,changed:f.sha256!==originalMap.get(f.path).sha256}))
const owned=generated.files.filter(f=>f.path!=='_headers').map(f=>f.path)
const oldMap=new Map(production.files.map(f=>[f.path,f]))
const changedPackagePages=generated.files.filter(f=>/^web\/packages\/[^/]+\/index.html$/.test(f.path)&&oldMap.has(f.path)&&oldMap.get(f.path).sha256!==f.sha256).slice(0,20).map(f=>({path:f.path,beforeSha256:oldMap.get(f.path).sha256,afterSha256:f.sha256}))
const protectedFile=p=>/(?:^|\/)(?:PACKAGES(?:\.gz|\.rds)?|[^/]+\.(?:tar\.gz|tgz|zip|pdf|rds))$/.test(p)||/^(?:web\/(?:checks|views)\/|.*\/(?:vignettes|readme|news)\/)/.test(p)
validateOverlayPaths(owned)
writeFileSync(out+'/inventory.json',JSON.stringify({original,generated,production,source,collisions,owned,changedPackagePages,protectedPolicy:'Repository indexes, payload archives, PDF, checks/views/materials cannot be replaced by overlay; HTML index ownership remains a separate review.'},null,2))
console.log(JSON.stringify({originalFiles:original.files.length,generatedFiles:generated.files.length,originalBytes:original.totalBytes,generatedBytes:generated.totalBytes,productionBytes:production.totalBytes,collisions},null,2))
