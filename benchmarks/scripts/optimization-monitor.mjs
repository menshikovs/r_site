import { readFileSync } from 'node:fs'
const master = Number(readFileSync(process.argv[2], 'utf8').trim())
console.log(JSON.stringify({ monitorPid: process.pid, master }))
const pids = [master, ...readFileSync(`/proc/${master}/task/${master}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number)]
function sample() {
  const processes = pids.map(pid => {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1).split(' ')
    const status = readFileSync(`/proc/${pid}/status`, 'utf8')
    return { pid, ticks: Number(stat[11]) + Number(stat[12]), rss: Number(/^VmRSS:\s+(\d+)/m.exec(status)?.[1] || 0) * 1024 }
  })
  console.log(JSON.stringify({ at: Date.now(), processes, cpu: readFileSync('/proc/stat','utf8').split('\n')[0], availableKiB: Number(/^MemAvailable:\s+(\d+)/m.exec(readFileSync('/proc/meminfo','utf8'))?.[1]) }))
}
sample()
const timer = setInterval(sample, 100)
process.on('SIGTERM', () => { clearInterval(timer); sample(); process.exit() })
setTimeout(() => { clearInterval(timer); sample() }, Number(process.argv[3] || 12000))
