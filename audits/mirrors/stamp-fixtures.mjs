// Reproducible fixture timestamps, not a change to the production publisher.
import {readdirSync,readFileSync,statSync,utimesSync,existsSync} from 'node:fs'
import {join} from 'node:path'
const root='/var/tmp/cran-mirrors-20261029/releases',epoch=Date.parse('2026-10-01T00:00:00Z')/1000
function walk(dir,rel=''){for(const n of readdirSync(dir)){const route=rel+n,p=join(dir,n);if(statSync(p).isDirectory())walk(p,route+'/');else{const before=join(root,'a',route),same=existsSync(before)&&readFileSync(before).equals(readFileSync(p));const t=epoch+(dir.startsWith(root+'/b')&&!same?86400:0);utimesSync(p,t,t)}}}
walk(root+'/a');walk(root+'/b')
