import { chromium, webkit, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:4173';
const observations = [];
for (const entry of [
  { name: 'desktop', type: chromium, options: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
  { name: 'mobile', type: webkit, options: { ...devices['iPhone 13'] } },
]) {
  const browser = await entry.type.launch({ headless: true });
  try {
    const page = await browser.newPage(entry.options);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL);
    await page.locator('.loading-curtain').waitFor({ state: 'detached', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `artifacts/final-${entry.name}.png` });
    const renderer = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        fps: canvas.dataset.fps, drawCalls: canvas.dataset.drawCalls,
        viewport: [window.innerWidth, window.innerHeight],
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl?.getParameter(gl.VENDOR),
      };
    });
    observations.push({ name: entry.name, capturedAt: new Date().toISOString(), ...renderer, errors });
  } finally { await browser.close(); }
}
await writeFile('artifacts/render-backends.json', JSON.stringify(observations, null, 2));
console.log(JSON.stringify(observations, null, 2));
