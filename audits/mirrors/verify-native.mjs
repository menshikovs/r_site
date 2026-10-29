import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync,readdirSync,lstatSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {portableHtml} from '../../src/static-urls.mjs'
const root='/var/tmp/cran-mirrors-20261029',out=new URL('./2026-10-29/',import.meta.url)
const manifest=JSON.parse(readFileSync(new URL('full-manifest.json',out))),owned=new Set(manifest.files.map(f=>f.path))
const original=JSON.parse(readFileSync(new URL('../adoption/2026-10-29/inventory.json',import.meta.url))).original.files
const sha=b=>createHash('sha256').update(b).digest('hex')
const originals=new Set(original.map(f=>f.path)),targets=new Set(),rootRelative=[],unquoted=[],brokenFragments=[],contents=new Map(),anchors=new Map(),counts={html:0,localReferences:0,externalReferences:0,fragmentReferences:0,canonical:0}
for(const f of manifest.files){const bytes=readFileSync(join(root,'full',f.path));assert.equal(sha(bytes),f.sha256,f.path);if(!/\.html?$/i.test(f.path))continue;counts.html++;const html=bytes.toString();contents.set(f.path,html);anchors.set(f.path,new Set([...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)].map(m=>m[1])))}
for(const [path,html] of contents){
 for(const [tag] of html.matchAll(/<(?:a|link|img|form|script)\b[^>]*>/gi)){
  if(/rel="canonical"/.test(tag)){counts.canonical++;continue}
  for(const match of tag.matchAll(/\b(?:href|src|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)){
   const value=match[1]??match[2]??match[3];if(match[3])unquoted.push({path,value})
   if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)){counts.externalReferences++;continue}
   if(!value)continue
   counts.localReferences++;if(value.startsWith('/'))rootRelative.push({path,value})
   const decoded=value.replaceAll('&amp;','&'),url=new URL(decoded,'https://mirror.invalid/pub/CRAN/'+path)
   assert.ok(url.pathname.startsWith('/pub/CRAN/'),`Escaping mount: ${path} ${value}`)
   let route=decodeURIComponent(url.pathname.slice('/pub/CRAN/'.length));if(!route||route.endsWith('/'))route+='index.html';targets.add(route)
   if(url.hash&&anchors.has(route)){counts.fragmentReferences++;const id=decodeURIComponent(url.hash.slice(1));if(!anchors.get(route).has(id))brokenFragments.push({path,value,target:route,id})}
  }
 }
}
const absent=[...targets].filter(p=>!owned.has(p)&&!originals.has(p)),generatedTargets=[...targets].filter(p=>owned.has(p)),officialTargets=[...targets].filter(p=>!owned.has(p)&&originals.has(p))
const baselineFragments=brokenFragments.map(f=>{const source=readFileSync('/var/tmp/cran-adoption-20261029/releases/r2/'+f.path,'utf8'),target=readFileSync('/var/tmp/cran-adoption-20261029/releases/r2/'+f.target,'utf8');return{...f,referenceAlreadyPresent:source.includes('#'+f.id),targetAlreadyAbsent:!new RegExp(`(?:id|name)=["']${f.id}["']`).test(target)}})
assert.ok(baselineFragments.every(f=>f.referenceAlreadyPresent&&f.targetAlreadyAbsent))
for(const f of original){assert.equal(sha(readFileSync('/var/tmp/cran-adoption-20261029/original/'+f.path)),f.sha256);if(!owned.has(f.path))assert.equal(sha(readFileSync(join(root,'full',f.path))),f.sha256)}
let directories=0;function dirs(dir){for(const name of readdirSync(dir)){const p=join(dir,name);if(lstatSync(p).isDirectory()){directories++;dirs(p)}}}dirs(root+'/full')
writeFileSync(new URL('link-audit.json',out),JSON.stringify({counts,rootRelative,unquoted,brokenFragments,baselineFragments,distinctGeneratedTargets:generatedTargets.length,distinctPreservedOfficialTargets:officialTargets.length,notInLimitedCorpus:absent.length,absentExamples:absent.slice(0,30),allGeneratedHashesMatch:true,originalsUnchanged:original.length,nonownedOriginalsPreserved:original.filter(f=>!owned.has(f.path)).length,directories,scope:'Checks generated files plus 30-file official corpus; absent resources are not claimed to exist locally'},null,2))
assert.equal(rootRelative.length,0);console.log(JSON.stringify({counts,rootRelative:rootRelative.length,unquoted:unquoted.length,brokenFragments:brokenFragments.length,absent:absent.length,directories}))
