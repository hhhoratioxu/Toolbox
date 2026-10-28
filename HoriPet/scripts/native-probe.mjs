// A visible, disposable acceptance fixture. This is never included in the app.
// Use real OS input on the cat and the window beneath it, then inspect status.
import { _electron as electron } from '@playwright/test'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createInterface } from 'node:readline'
const root = resolve(import.meta.dirname, '..'), profile = await mkdtemp(join(root, '.test-profile-native-'))
await writeFile(join(profile, 'companion.json'), JSON.stringify({ version: 1, settings: { autonomous: false, followMouse: false, name: 'Mochi', theme: 'dark' }, position: { x: 560, y: 320 } }))
const env = { ...process.env, HORIPET_PROFILE: profile }; delete env.ELECTRON_RUN_AS_NODE
const app = await electron.launch({ ...(env.HORIPET_APP ? { executablePath: resolve(env.HORIPET_APP), args: [] } : { args: [root] }), env })
const pet = await app.firstWindow(); await pet.waitForSelector('.cat')
await app.evaluate(async ({ BrowserWindow }) => {
  const underlay = new BrowserWindow({ title: 'HoriPet · Native input check', x: 360, y: 230, width: 700, height: 500, backgroundColor: '#32443e', webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } })
  await underlay.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body style="margin:0;padding:28px;background:#32443e;color:#eef4e9;font:16px -apple-system"><h2>HoriPet · 原生鼠标验收</h2><p>这是一扇用于检查穿透和键盘焦点的临时窗口。</p><p>透明角落点击应计数；点击猫本身不应计数。</p><p id="count">背景点击：0</p><input autofocus placeholder="键盘焦点应留在这里" style="padding:12px;border-radius:8px;border:0;width:330px"><script>window.clicks=0;document.addEventListener('click',()=>{document.getElementById('count').textContent='背景点击：'+(++window.clicks)})</script></body></html>`))
  underlay.show(); underlay.focus()
})
const out = resolve(root, 'test-results/native-macos'); await mkdir(out, { recursive: true })
async function status() {
  const state = await pet.evaluate(() => window.horipet.getSnapshot())
  const native = await app.evaluate(async ({ BrowserWindow, screen }) => {
    const windows = BrowserWindow.getAllWindows(), first = windows.find(w => w.webContents.getURL().includes('window=pet')), underlay = windows.find(w => w.getTitle().includes('Native input check'))
    return { bounds: first.getBounds(), focus: BrowserWindow.getFocusedWindow()?.getTitle(), cursor: screen.getCursorScreenPoint(), clicks: await underlay.webContents.executeJavaScript('window.clicks') }
  })
  console.log(JSON.stringify({ native, state: state.behavior, settings: state.settings, pet: state.pet }))
}
console.log('READY: status | settings | follow | stop-follow | menu | screenshot | quit')
await status()
for await (const command of createInterface({ input: process.stdin })) {
  try {
    if (command === 'quit') break
    if (command === 'settings') await pet.evaluate(() => window.horipet.openSettings())
    if (command === 'follow') await pet.evaluate(() => window.horipet.updateSettings({ followMouse: true }))
    if (command === 'stop-follow') await pet.evaluate(() => window.horipet.updateSettings({ followMouse: false }))
    if (command === 'menu') await pet.evaluate(() => window.horipet.menu())
    if (command === 'screenshot') {
      await pet.screenshot({ path: join(out, 'pet.png'), omitBackground: true })
      const underlay = (await app.windows()).find(w => w !== pet)
      await underlay.screenshot({ path: join(out, 'native-underlay.png') })
    }
    await status()
  } catch (error) { console.error(String(error)) }
}
await app.close()
process.stdin.pause()
