export function validateOverlayPaths(paths){
  for(const path of paths){
    if(path.startsWith('/')||path.split('/').includes('..')||path.includes('\\'))throw Error(`Unsafe overlay path: ${path}`)
    if(/(?:^|\/)(?:PACKAGES(?:\.gz|\.rds)?|[^/]+\.(?:tar\.(?:gz|xz|bz2)|tgz|zip|pdf|rds))$/.test(path)||/^(?:web\/(?:checks|views)\/|.*\/(?:vignettes|readme|news)\/)/.test(path))throw Error(`Protected original resource: ${path}`)
    if(!/\.(?:html?|css|js|svg)$/.test(path)&&path!=='assets/package-search.json')throw Error(`Unreviewed overlay file class: ${path}`)
  }
  return true
}
