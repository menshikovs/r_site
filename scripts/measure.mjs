import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const root = resolve('dist')
const files = []
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) walk(path)
    else files.push(path)
  }
}
walk(root)
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0)
const totalGzipBytes = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0)
const homeBytes = statSync(join(root, 'index.html')).size
const cssBytes = statSync(join(root, 'assets', 'site.css')).size
const homeGzipBytes = gzipSync(readFileSync(join(root, 'index.html'))).length
const cssGzipBytes = gzipSync(readFileSync(join(root, 'assets', 'site.css'))).length
const logoBytes = statSync(join(root, 'Rlogo.svg')).size
console.log(`Generated files: ${files.length}`)
console.log(`Total transfer size before HTTP compression: ${totalBytes.toLocaleString('en-US')} bytes`)
console.log(`Sum of per-file gzip sizes: ${totalGzipBytes.toLocaleString('en-US')} bytes`)
console.log(`Homepage HTML: ${homeBytes.toLocaleString('en-US')} bytes`)
console.log(`Homepage HTML gzip estimate: ${homeGzipBytes.toLocaleString('en-US')} bytes`)
console.log(`Stylesheet: ${cssBytes.toLocaleString('en-US')} bytes`)
console.log(`Stylesheet gzip estimate: ${cssGzipBytes.toLocaleString('en-US')} bytes`)
console.log(`Local R logo: ${logoBytes.toLocaleString('en-US')} bytes`)
console.log(`Largest assets: ${files.map(file => ({ path: relative(root, file), size: statSync(file).size })).sort((a, b) => b.size - a.size).slice(0, 5).map(file => `${file.path} (${file.size.toLocaleString('en-US')} bytes)`).join('; ')}`)
