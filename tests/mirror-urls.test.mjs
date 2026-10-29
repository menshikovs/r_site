import test from 'node:test'
import assert from 'node:assert/strict'
import {portableHtml} from '../src/static-urls.mjs'

test('one artifact resolves at every prefix, retaining fragments and canonical identity',()=>{
  const route='web/packages/ggplot2/index.html'
  const html=portableHtml('<link rel="canonical" href="/web/packages/ggplot2/index.html"><link href="/assets/site.css"><a href="/web/packages/termr/index.html">termr</a><a href="#imports">anchor</a><form action="/web/packages/"></form>',route)
  for(const prefix of ['/','/CRAN/','/pub/CRAN/']){
    const base='https://mirror.example'+prefix+route
    const urls=[...html.matchAll(/(?:href|action)="([^"]+)"/g)].map(m=>new URL(m[1],base).href)
    assert.deepEqual(urls,[
      'https://cran.r-project.org/web/packages/ggplot2/index.html',
      'https://mirror.example'+prefix+'assets/site.css',
      'https://mirror.example'+prefix+'web/packages/termr/index.html',
      base+'#imports','https://mirror.example'+prefix+'web/packages/'
    ])
  }
})
test('repository opt-in preserves central provenance, metadata and unrelated origins',()=>{
  const html='<a href="https://cran.r-project.org/src/contrib/a.tar.gz">src</a><a rel="external" href="https://cran.r-project.org/web/packages/a/index.html">official</a><a target="_blank" href="https://cran.r-project.org/doc/a.html">metadata</a><a href="https://cran-archive.r-project.org/bin/">archive</a><a href="//example.org/x">other</a>'
  assert.equal(portableHtml(html,'index.html'),html)
  const mirror=portableHtml(html,'index.html',{mirrorResources:true})
  assert.ok(mirror.startsWith('<a href="src/contrib/a.tar.gz">'))
  assert.ok(mirror.endsWith(html.slice(html.indexOf('<a rel='))))
})
test('catalog redirect is static and prefix relative',()=>{
  const html=portableHtml('<meta http-equiv="refresh" content="0;url=/web/packages/"><a href="/web/packages/">catalog</a>','web/packages/available_packages_by_name.html')
  assert.match(html,/url=\.\//);assert.match(html,/href="\.\/"/)
  assert.doesNotMatch(html,/<base/i)
})
