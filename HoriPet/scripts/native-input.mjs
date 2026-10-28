// Native OS input acceptance; separate from DevTools-delivered renderer events.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

const windowsDriver = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class HoriPetMouse {
 [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx,dy; public uint mouseData,dwFlags,time; public IntPtr dwExtraInfo; }
 [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; }
 [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs,int size);
 public static void Button(uint flag) { var input=new INPUT(); input.type=0; input.u.mi.dwFlags=flag; if(SendInput(1,new[]{input},Marshal.SizeOf(typeof(INPUT)))!=1) throw new Exception("Native input unavailable"); }
}
'@
`
function mouse(command, x, y, endX, endY) {
  const numbers = [x, y, endX, endY].filter(v => v !== undefined).map(v => Math.round(v))
  if (process.platform === 'darwin') {
    execFileSync(process.env.HORIPET_MOUSE_DRIVER, [command, ...numbers.map(String)])
    return
  }
  const [px, py, ex, ey] = numbers
  let code = windowsDriver + `\nif(-not [HoriPetMouse]::SetCursorPos(${px},${py})){throw 'Native desktop unavailable'}; Start-Sleep -Milliseconds 250;\n`
  if (command === 'click' || command === 'drag') {
    code += '[HoriPetMouse]::Button(2); Start-Sleep -Milliseconds 80;\n'
    if (command === 'drag') {
      for (let i = 1; i <= 24; i++) code += `[HoriPetMouse]::SetCursorPos(${Math.round(px + (ex - px) * i / 24)},${Math.round(py + (ey - py) * i / 24)}) | Out-Null; Start-Sleep -Milliseconds 35;\n`
    }
    code += '[HoriPetMouse]::Button(4);'
  }
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code], { stdio: 'pipe' })
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

export async function verifyNativeInput(app, page, output, check) {
  const report = { platform: process.platform, driver: process.platform === 'darwin' ? 'CGEvent' : 'SetCursorPos + SendInput', checks: [] }
  const original = await app.evaluate(({ screen }) => screen.getCursorScreenPoint())
  let helperId
  try {
    const fixture = await app.evaluate(async ({ BrowserWindow }) => {
      const pet = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('window=pet')), b = pet.getBounds()
      const helper = new BrowserWindow({ title: 'HoriPet native input fixture', ...b, frame: false, show: true, backgroundColor: '#35534a', webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } })
      await helper.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html><body style="background:#35534a;color:white;font:14px system-ui"><h3>HoriPet native input fixture</h3><p id="count">Background clicks: 0</p><input autofocus placeholder="Keyboard focus stays here"><script>window.clicks=0;document.addEventListener("click",()=>{document.getElementById("count").textContent="Background clicks: "+(++window.clicks)})</script></body></html>'))
      helper.show(); helper.focus()
      return { id: helper.id, bounds: b }
    })
    helperId = fixture.id
    const b = fixture.bounds, center = { x: b.x + b.width * .49, y: b.y + b.width * .59 }
    const clicks = () => app.evaluate(async ({ BrowserWindow }, id) => BrowserWindow.fromId(id).webContents.executeJavaScript('window.clicks'), helperId)
    await check('Native OS click passes through a transparent corner', async () => {
      const before = await clicks()
      mouse('click', b.x + 12, b.y + 12)
      await sleep(200)
      const cursor = await app.evaluate(({ screen }) => screen.getCursorScreenPoint())
      assert.ok(Math.abs(cursor.x - b.x - 12) <= 2 && Math.abs(cursor.y - b.y - 12) <= 2, 'OS cursor did not move; native input may be unavailable')
      assert.equal(await clicks(), before + 1)
      report.checks.push('transparent corner receives a real OS click in underlying window')
    })
    await check('Native OS click reaches the cat without stealing keyboard focus', async () => {
      const before = await clicks()
      mouse('click', center.x, center.y)
      await page.waitForFunction(async () => ['touch', 'happy'].includes((await window.horipet.getSnapshot()).behavior.state), null, { polling: 100, timeout: 5000 })
      assert.equal(await clicks(), before)
      assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.id), helperId)
      report.checks.push('cat reacts, underlying click count unchanged, keyboard focus retained')
    })
    await check('Native OS drag moves the compact window and restores animation', async () => {
      mouse('drag', center.x, center.y, center.x - 95, center.y - 65)
      await sleep(200)
      const moved = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('window=pet')).getBounds())
      assert.ok(Math.abs(moved.x - b.x + 95) < 8 && Math.abs(moved.y - b.y + 65) < 8, `native drag did not move by the expected distance: ${JSON.stringify(moved)}`)
      assert.notEqual((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state, 'drag')
      report.checks.push({ dragBefore: b, dragAfter: moved })
      const png = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('window=pet')).webContents.capturePage()).toPNG().toString('base64'))
      await writeFile(join(output, 'pet-after-native-drag.png'), Buffer.from(png, 'base64'))
    })
    await check('Native cursor follow starts, moves, and rests after cursor leaves', async () => {
      await page.evaluate(() => window.horipet.updateSettings({ followMouse: true }))
      await sleep(1000)
      const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('window=pet')).getBounds())
      mouse('move', before.x - 110, before.y + 80)
      await sleep(700)
      assert.equal((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state, 'follow')
      const after = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('window=pet')).getBounds())
      assert.notEqual(after.x, before.x)
      mouse('move', original.x, original.y)
      await sleep(6800)
      assert.equal((await page.evaluate(() => window.horipet.getSnapshot())).behavior.state, 'idle')
      await page.evaluate(() => window.horipet.updateSettings({ followMouse: false }))
      report.checks.push({ followingBefore: before, followingAfter: after, left: 'idle after expiry' })
    })
  } finally {
    if (helperId) await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)?.destroy(), helperId).catch(() => {})
    mouse('move', original.x, original.y)
    await writeFile(join(output, 'native-input.json'), JSON.stringify(report, null, 2))
  }
}
