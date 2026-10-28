import { _electron as electron } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { verifyNativeInput } from './native-input.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(process.env.HORIPET_EVIDENCE || join(root, 'test-results', `${process.platform}-${process.arch}`))
const profile = process.env.HORIPET_SMOKE_PROFILE ? resolve(process.env.HORIPET_SMOKE_PROFILE) : await mkdtemp(join(root, '.test-profile-smoke-'))
await mkdir(output, { recursive: true }); await mkdir(profile, { recursive: true })
const executablePath = process.env.HORIPET_APP
const results = { platform: process.platform, arch: process.arch, packaged: !!executablePath, timestamp: new Date().toISOString(), checks: [], errors: [] }
const env = { ...process.env, HORIPET_PROFILE: profile }
delete env.ELECTRON_RUN_AS_NODE
let application, activePage
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function quitFromApp(app, page) {
  const child = app.process()
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise(resolve => child.once('exit', resolve))
  // Use exactly the same preload/IPC route as the user's Quit button. Closing
  // Playwright's debugger context can deadlock after a relaunch on ARM macOS.
  // A renderer destroyed during quit may never return the evaluate reply. The
  // process exit, not that debugger reply, is the shutdown completion signal.
  void page.evaluate(() => window.horipet.quit()).catch(() => {})
  let deadline
  try {
    await Promise.race([exited, new Promise((_resolve, reject) => { deadline = setTimeout(() => reject(new Error('Application did not exit after its Quit action')), 10000) })])
  } finally { clearTimeout(deadline) }
}
async function check(name, run) {
  console.log(`CHECK ${name}`)
  let deadline
  try {
    await Promise.race([run(), new Promise((_resolve, reject) => { deadline = setTimeout(() => reject(new Error(`Desktop check timed out: ${name}`)), 30000) })])
    results.checks.push({ name, passed: true }); console.log(`PASS ${name}`)
  } finally { clearTimeout(deadline) }
}
async function launch() {
  const app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: [root] }), env, timeout: 60000 })
  const page = await app.firstWindow()
  page.setDefaultTimeout(15000)
  if (process.env.CI && process.platform === 'darwin') {
    // Hosted macOS desktops can mark a non-focusable pet as occluded. Keep the
    // test renderer awake; the shipped app retains normal power throttling.
    await app.evaluate(({ BrowserWindow }) => { for (const w of BrowserWindow.getAllWindows()) w.webContents.setBackgroundThrottling(false) })
    results.ciRendering = 'Background throttling disabled for hosted-macOS test windows only'
  }
  await page.waitForSelector('[data-testid="pet-surface"]', { timeout: 30000 })
  page.on('pageerror', e => results.errors.push(e.message))
  return { app, page }
}
try {
  let launched = await launch(); application = launched.app; let page = launched.page; activePage = page
  const pid = application.process().pid
  await check('First launch renders a real Electron companion', async () => {
    assert.equal(await page.locator('.cat').count(), 1)
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true)
  })
  await page.evaluate(() => window.horipet.updateSettings({ autonomous: false, followMouse: false, visible: true, theme: 'dark', locale: 'zh-CN', name: 'Mochi' }))
  await check('Transparent frameless compact window, focus and renderer sandbox', async () => {
    const info = await application.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0], prefs = w.webContents.getLastWebPreferences()
      return { color: w.getBackgroundColor(), focusable: w.isFocusable(), bounds: w.getBounds(), isolation: prefs.contextIsolation, sandbox: prefs.sandbox, node: prefs.nodeIntegration }
    })
    // Electron's getter returns RGB on some platforms, dropping alpha. Verify
    // actual composited pixel alpha below rather than inferring it from this getter.
    assert.match(info.color, /^#000000(?:00)?$/); assert.equal(info.focusable, false)
    assert.equal(info.isolation, true); assert.equal(info.sandbox, true); assert.equal(info.node, false)
    assert.ok(info.bounds.width <= 340 && info.bounds.height <= 380)
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
    // Do not wait on requestAnimationFrame: a virtual desktop can occlude a
    // non-focusable window and legitimately suspend its animation callbacks.
    await sleep(200)
    // capturePage can race the first Viz surface on virtual macOS GPUs. A
    // Chromium screenshot still reads the live renderer, never a mock surface.
    let png
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const image = await application.evaluate(async ({ BrowserWindow }) => {
          let deadline
          try {
            return await Promise.race([
              BrowserWindow.getAllWindows()[0].webContents.capturePage().then(image => image.toPNG().toString('base64')),
              new Promise((_resolve, reject) => { deadline = setTimeout(() => reject(new Error('UnknownVizError: surface capture timed out')), 2500) })
            ])
          } finally { clearTimeout(deadline) }
        })
        png = Buffer.from(image, 'base64'); results.captureBackend = 'Electron capturePage'; break
      } catch (error) {
        if (!String(error).includes('UnknownVizError')) throw error
        await sleep(350)
      }
    }
    if (!png) { png = await page.screenshot({ omitBackground: true }); results.captureBackend = 'Chromium live renderer (native Viz capture unavailable)' }
    await writeFile(join(output, 'pet.png'), png)
    const { data, info: pixels } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(data[3], 0, 'window corner must be transparent')
    const opaque = [...data.filter((_v, i) => i % 4 === 3)].filter(a => a > 250).length
    assert.ok(opaque > pixels.width * pixels.height * .12, 'the cat must actually be visible')
  })
  await check('Click and double-click produce a real state transition', async () => {
    const size = await page.evaluate(async () => (await window.horipet.getSnapshot()).settings.size)
    await page.mouse.click(size * .49, size * .58)
    await sleep(350)
    await page.waitForFunction(async () => ['touch', 'happy'].includes((await window.horipet.getSnapshot()).behavior.state), null, { polling: 100, timeout: 5000 })
    await sleep(300)
    await page.mouse.dblclick(size * .49, size * .58)
    await sleep(350)
    await page.waitForFunction(async () => { const s = await window.horipet.getSnapshot(); return s.behavior.state === 'happy' && s.behavior.bubble === 'love' }, null, { polling: 100, timeout: 5000 })
  })
  await check('Feeding, manual sleep and waking work through secure IPC', async () => {
    const before = await page.evaluate(() => window.horipet.getSnapshot())
    await page.evaluate(() => window.horipet.action('feed'))
    const fed = await page.evaluate(() => window.horipet.getSnapshot())
    assert.ok(fed.pet.hunger < before.pet.hunger); assert.equal(fed.behavior.state, 'eat')
    await page.evaluate(() => window.horipet.action('sleep'))
    assert.equal((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state, 'sleep')
    await page.evaluate(() => window.horipet.action('wake'))
    assert.equal((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state, 'wake')
  })
  await check('Invalid settings and arbitrary actions are rejected', async () => {
    assert.equal(await page.evaluate(async () => { try { await window.horipet.updateSettings({ size: -100 }); return false } catch { return true } }), true)
    assert.equal(await page.evaluate(async () => { try { await window.horipet.action('arbitrary-file-write'); return false } catch { return true } }), true)
  })
  await check('Pet can be hidden, shown and recovered into a screen work area', async () => {
    await page.evaluate(() => window.horipet.action('hide'))
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), false)
    await page.evaluate(() => window.horipet.action('reset-position'))
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true)
    const inside = await application.evaluate(({ BrowserWindow, screen }) => {
      const b = BrowserWindow.getAllWindows()[0].getBounds()
      return screen.getAllDisplays().some(({ workArea: a }) => b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height)
    })
    assert.equal(inside, true)
  })
  if (process.platform === 'win32' || process.env.HORIPET_MOUSE_DRIVER) {
    await verifyNativeInput(application, page, output, check)
  }
  await check('Preferences open, live changes apply, and closing keeps the pet alive', async () => {
    const waiting = application.waitForEvent('window')
    await page.evaluate(() => window.horipet.openSettings())
    const settings = await waiting
    settings.setDefaultTimeout(15000)
    settings.on('pageerror', e => results.errors.push(e.message))
    await settings.waitForSelector('[data-testid="settings-main"]')
    await sleep(350)
    await settings.screenshot({ path: join(output, 'settings-dark.png') })
    await settings.getByTestId('nav-preferences').click()
    await settings.getByRole('button', { name: '浅色', exact: true }).click()
    await settings.getByLabel('界面语言', { exact: true }).selectOption('en')
    await settings.getByTestId('nav-companion').click()
    await settings.getByRole('button', { name: 'Peach milk', exact: true }).click()
    const input = settings.getByLabel('A name to call home', { exact: true })
    await input.fill('Mochi Test'); await input.press('Enter')
    await settings.evaluate(() => { document.querySelector('.settings-main').scrollTop = 0 })
    await sleep(350)
    await settings.screenshot({ path: join(output, 'settings-light-en.png') })
    const data = await page.evaluate(() => window.horipet.getSnapshot())
    assert.equal(data.settings.skin, 'peach'); assert.equal(data.settings.locale, 'en'); assert.equal(data.settings.theme, 'light'); assert.equal(data.settings.name, 'Mochi Test')
    await settings.evaluate(() => window.horipet.closeSettings())
    await sleep(250)
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1)
    assert.equal(await page.locator('.cat').count(), 1)
  })
  await check('Core functionality works with the renderer offline', async () => {
    await page.context().setOffline(true)
    await page.reload(); await page.waitForSelector('.cat')
    await page.evaluate(() => window.horipet.action('pet'))
    assert.ok(['happy', 'touch'].includes((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state))
    await page.context().setOffline(false)
  })
  await check('Normal quit flushes data and leaves no live Electron child processes', async () => {
    let processes
    if (process.platform === 'win32') {
      const raw = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress'], { encoding: 'utf8' })
      processes = JSON.parse(raw).map(p => ({ pid: p.ProcessId, parent: p.ParentProcessId }))
    } else {
      processes = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map(line => { const [id, parent] = line.trim().split(/\s+/).map(Number); return { pid: id, parent } })
    }
    const descendants = new Set([pid])
    let added = true
    while (added) { added = false; for (const p of processes) if (descendants.has(p.parent) && !descendants.has(p.pid)) { descendants.add(p.pid); added = true } }
    await quitFromApp(application, page); application = undefined
    await sleep(700)
    for (const p of descendants) {
      let alive = true
      try { process.kill(p, 0) } catch { alive = false }
      assert.equal(alive, false, `process ${p} survived quit`)
    }
    results.processCleanup = { checkedCount: descendants.size, allExited: true }
    const saved = JSON.parse(await readFile(join(profile, 'companion.json'), 'utf8'))
    assert.equal(saved.settings.name, 'Mochi Test')
  })
  launched = await launch(); application = launched.app; page = launched.page; activePage = page
  await check('Relaunch restores settings, pet data and a safe saved position', async () => {
    const data = await page.evaluate(() => window.horipet.getSnapshot())
    assert.equal(data.settings.name, 'Mochi Test'); assert.equal(data.settings.skin, 'peach'); assert.equal(data.settings.locale, 'en')
    const saved = JSON.parse(await readFile(join(profile, 'companion.json'), 'utf8'))
    assert.ok(saved.position && Number.isFinite(saved.position.x))
  })
  assert.deepEqual(results.errors, [], 'renderer must not report errors')
} catch (error) {
  results.failure = String(error.stack || error); console.error(error); process.exitCode = 1
} finally {
  if (application) {
    try { await quitFromApp(application, activePage); results.relaunchQuit = true }
    catch (error) {
      results.shutdownFailure = String(error); process.exitCode = 1
      application.process().kill()
    }
  }
  await writeFile(join(output, 'desktop-smoke.json'), JSON.stringify(results, null, 2))
  console.log(`Evidence: ${output}`)
}
// All app checks and the observed process-exit deadline above have completed.
// Dispose a possibly lingering Playwright transport without keeping the CLI
// alive. This exits only the Node test driver, never marks forced app cleanup PASS.
process.exit(process.exitCode || 0)
