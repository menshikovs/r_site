import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {performance} from 'node:perf_hooks'
const root='/var/tmp/cran-mirrors-20261029',out=new URL('./2026-10-29/',import.meta.url)
function inventory(base){const files=[];function walk(dir,rel=''){for(const name of readdirSync(dir)){const route=rel+name,p=join(dir,name),s=statSync(p);if(s.isDirectory())walk(p,route+'/');else{const b=readFileSync(p);files.push({path:route,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),mtimeMs:s.mtimeMs})}}}walk(base);return files}
const a=inventory(root+'/releases/a'),b=inventory(root+'/releases/b'),am=new Map(a.map(f=>[f.path,f])),bm=new Map(b.map(f=>[f.path,f]))
const added=b.filter(f=>!am.has(f.path)),removed=a.filter(f=>!bm.has(f.path)),changed=b.filter(f=>am.has(f.path)&&am.get(f.path).sha256!==f.sha256),mtimeOnly=b.filter(f=>am.has(f.path)&&am.get(f.path).sha256===f.sha256&&am.get(f.path).mtimeMs!==f.mtimeMs)
const sync=release=>{const t=performance.now();const stdout=execFileSync('rsync',['-rptlzvi','--delete','--stats',root+'/releases/'+release+'/',root+'/mirror/'],{encoding:'utf8'});writeFileSync(new URL('normal-'+release+'.txt',out),stdout);return{wallMs:performance.now()-t,stdout}}
sync('a');const normalUpdate=sync('b');const actual=inventory(root+'/mirror');const actualMap=new Map(actual.map(f=>[f.path,f]));const mismatch=b.filter(f=>actualMap.get(f.path)?.sha256!==f.sha256);if(mismatch.length||actual.length!==b.length){writeFileSync(new URL('quick-check-mismatch.json',out),JSON.stringify({expected:b.length,actual:actual.length,mismatch},null,2));throw Error('Mirror B content mismatch')}
const rollback=sync('a')
const full=inventory(root+'/full'),fullGenerated=JSON.parse(readFileSync(new URL('full-manifest.json',out))).files
const metrics={scope:'Local whole-file rsync with CRAN HOWTO flags, not remote wire benchmark',aFiles:a.length,bFiles:b.length,added,removed,changed,mtimeOnly,normalUpdate,rollback,fullGeneratedFiles:fullGenerated.length,fullGeneratedBytes:fullGenerated.reduce((n,f)=>n+f.bytes,0),assets:fullGenerated.filter(f=>f.path.startsWith('assets/')),fullMergedFiles:full.length,du:execFileSync('du',['-s','-B1',root+'/full',root+'/releases/a',root+'/releases/b',root+'/mirror'],{encoding:'utf8'}),inodeStats:execFileSync('df',['-i',root],{encoding:'utf8'})}
writeFileSync(new URL('sync-metrics.json',out),JSON.stringify(metrics,null,2));console.log(JSON.stringify({added:added.length,removed:removed.length,changed:changed.length,mtimeOnly:mtimeOnly.length,wallMs:normalUpdate.wallMs}))
