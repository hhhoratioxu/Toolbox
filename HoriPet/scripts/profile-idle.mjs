import { _electron as electron } from '@playwright/test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const root = resolve(import.meta.dirname, '..'), profile = await mkdtemp(join(root, '.test-profile-performance-'))
await writeFile(join(profile, 'companion.json'), JSON.stringify({ version: 1, settings: { autonomous: false, followMouse: false } }))
const env = { ...process.env, HORIPET_PROFILE: profile }; delete env.ELECTRON_RUN_AS_NODE
const app = await electron.launch({ ...(env.HORIPET_APP ? { executablePath: resolve(env.HORIPET_APP), args: [] } : { args: [root] }), env })
try {
  const page = await app.firstWindow(); await page.waitForSelector('.cat')
  await new Promise(r => setTimeout(r, 5000))
  await app.evaluate(({ app }) => app.getAppMetrics())
  await new Promise(r => setTimeout(r, 10000))
  const metrics = await app.evaluate(({ app }) => app.getAppMetrics())
  const report = { platform: process.platform, arch: process.arch, timestamp: new Date().toISOString(),
    scenario: 'one visible idle cat; preferences closed; autonomy and following disabled; 5s warmup then 10s sample',
    units: { cpu: 'Electron reported percentCPUUsage; sum across processes', memory: 'workingSetSize in KiB' },
    totalReportedCPUPercent: metrics.reduce((n, p) => n + p.cpu.percentCPUUsage, 0),
    totalWorkingSetMiB: metrics.reduce((n, p) => n + p.memory.workingSetSize, 0) / 1024,
    processes: metrics.map(p => ({ type: p.type, cpu: p.cpu.percentCPUUsage, workingSetKiB: p.memory.workingSetSize })) }
  const out = resolve(env.HORIPET_EVIDENCE || join(root, 'test-results/performance'))
  await mkdir(out, { recursive: true }); await writeFile(join(out, 'idle-profile.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await app.close() }
