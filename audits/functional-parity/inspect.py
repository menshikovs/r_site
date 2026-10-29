import json, re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path('audits/functional-parity/2026-10-29')

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows=[]; self.links=[]; self.ids=[]; self.meta={}; self.canonical=None
        self.row=None; self.cell=None; self.anchor=None; self.heading=None
        self.title=''; self.description=''; self.paragraph=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id') or (tag=='a' and a.get('name')): self.ids.append(a.get('id') or a.get('name'))
        if tag=='meta': self.meta[a.get('name',a.get('property',''))]=a.get('content')
        if tag=='link' and a.get('rel')=='canonical': self.canonical=a.get('href')
        if tag=='tr': self.row=[]
        if tag in ('td','th') and self.row is not None: self.cell={'text':'','links':[]}
        if tag=='a' and a.get('href'):
            self.anchor={'href':a['href'],'text':''}; self.links.append(self.anchor)
            if self.cell is not None: self.cell['links'].append(self.anchor)
        if tag=='h2' and not self.title: self.heading=''
        if tag=='p' and not self.description and not self.rows: self.paragraph=''
    def handle_data(self, value):
        if self.cell is not None: self.cell['text']+=value
        if self.anchor is not None: self.anchor['text']+=value
        if self.heading is not None: self.heading+=value
        if self.paragraph is not None: self.paragraph+=value
    def handle_endtag(self, tag):
        if tag in ('td','th') and self.cell is not None:
            self.cell['text']=' '.join(self.cell['text'].split()); self.row.append(self.cell); self.cell=None
        if tag=='tr' and self.row is not None:
            if len(self.row)>=2: self.rows.append({'label':self.row[0]['text'].strip(' :'),'value':self.row[1]['text'],'links':self.row[1]['links']})
            self.row=None
        if tag=='a': self.anchor=None
        if tag=='h2' and self.heading is not None: self.title=' '.join(self.heading.split()); self.heading=None
        if tag=='p' and self.paragraph is not None: self.description=' '.join(self.paragraph.split()); self.paragraph=None

result=[]
for name in ['ggplot2','data.table','Rcpp','termr','MASS']:
    page=Page(); page.feed((ROOT/f'{name}-official.html').read_text(encoding='utf-8'))
    result.append({'name':name,'canonical':page.canonical,'title':page.title,'description':page.description,'rows':page.rows,'links':page.links,'ids':page.ids,'meta':page.meta})
(ROOT/'official-structure.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
for p in result:
    print(p['name'],len(p['links']),'links')
    for r in p['rows']:
        print(' ',r['label'], ':',r['value'][:180],f"[{len(r['links'])} links]")
