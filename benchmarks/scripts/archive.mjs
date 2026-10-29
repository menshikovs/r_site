import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { output, project, snapshot, digest } from './prepare.mjs'

const source=JSON.parse(readFileSync(join(output,'source-manifest.json'),'utf8'))
const candidatePaths=['index.html','bin/windows/index.html','web/packages/index.html','web/packages/ggplot2/index.html','manuals.html','assets/site.css','assets/search.js','assets/package-search.json','Rlogo.svg','web/packages/by-name/g.html']
const toWsl=path=>path.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,drive)=>'/mnt/'+drive.toLowerCase())
function tar(target,root,paths) {
  if(process.platform==='win32')execFileSync('wsl.exe',['-d','Ubuntu','--','tar','-czf',toWsl(target),'-C',toWsl(root),'--',...paths],{windowsHide:true})
  else execFileSync('tar',['-czf',target,'-C',root,'--',...paths])
}
const sources=source.records.filter(r=>r.localPath).map(r=>r.localPath)
const candidate=candidatePaths.map(path=>{const bytes=readFileSync(join(project,'dist',path));return {path,bytes:bytes.length,sha256:digest(bytes)}})
writeFileSync(join(output,'candidate-input-manifest.json'),JSON.stringify(candidate,null,2))
const archives=[]
for(const [name,root,paths]of [['original-snapshot.tar.gz',snapshot,sources],['candidate-snapshot.tar.gz',join(project,'dist'),candidatePaths]]) {
  const path=join(output,name);tar(path,root,paths)
  const bytes=readFileSync(path);archives.push({name,files:paths.length,bytes:bytes.length,sha256:digest(bytes)})
}
writeFileSync(join(output,'archives.json'),JSON.stringify(archives,null,2));console.log(JSON.stringify(archives,null,2))
