import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
const svg = await readFile(new URL('../resources/icon.svg', import.meta.url))
const dir = new URL('../resources/', import.meta.url)
await sharp(svg).resize(512).png().toFile(new URL('icon.png', dir).pathname)
const chunks = []
for (const [type, size] of [['ic07',128],['ic08',256],['ic09',512],['ic10',1024]]) {
  const png = await sharp(svg).resize(size).png().toBuffer()
  const head = Buffer.alloc(8); head.write(type); head.writeUInt32BE(8 + png.length, 4)
  chunks.push(head, png)
}
const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(8 + chunks.reduce((s,b)=>s+b.length,0),4)
await writeFile(new URL('icon.icns', dir), Buffer.concat([header,...chunks]))
const png = await sharp(svg).resize(256).png().toBuffer()
const ico = Buffer.alloc(22); ico.writeUInt16LE(1,2); ico.writeUInt16LE(1,4); ico.writeUInt16LE(1,10); ico.writeUInt16LE(32,12); ico.writeUInt32LE(png.length,14); ico.writeUInt32LE(22,18)
await writeFile(new URL('icon.ico',dir),Buffer.concat([ico,png]))
const tray = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><path d="M7 22 6 5q0-3 3-1l10 9h6l10-9q3-2 3 1l-1 17c2 12-6 18-15 18S5 34 7 22Z" fill="#111"/><path d="M14 25q3-4 6 0m6 0q3-4 6 0m-12 6q3 3 6 0" stroke="#fff" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>`
await sharp(Buffer.from(tray)).png().toFile(new URL('trayTemplate.png',dir).pathname)
await sharp(svg).resize(64).png().toFile(new URL('tray.png',dir).pathname)
console.log('Original HoriPet icons generated: PNG, ICNS, ICO and tray template.')
