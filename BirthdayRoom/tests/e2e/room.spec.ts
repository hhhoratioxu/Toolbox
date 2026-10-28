import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { isWalkable } from '../../src/game/world';

async function enter(page: Page, navigate = true) {
  if (navigate) await page.goto('/');
  await expect(page.getByRole('button', { name: /走进小屋|继续上次的探索/ })).toBeEnabled({
    timeout: 60_000,
  });
  await page.locator('.loading-curtain').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /走进小屋|继续上次的探索/ }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-mode', 'walk');
  await page.keyboard.press('Escape');
}
async function guide(page: Page, name: string) {
  await page.getByRole('button', { name: '线索提示', exact: true }).click();
  await page.getByRole('button', { name: '带我去看看', exact: true }).click();
  await expect(page.locator('.interact-prompt')).toContainText(name, { timeout: 25_000 });
  await page.locator('.interact-prompt').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function keep(page: Page, count: number) {
  await page.getByRole('button', { name: '把心意收好', exact: true }).click();
  await expect(page.getByLabel(`进度 ${count}/5`, { exact: true })).toBeVisible();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
}
test('complete playable treasure hunt, persistence, birthday animation and replay', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('pointer lock')) errors.push(msg.text());
  });
  await page.goto('/');
  await page.locator('.loading-curtain').waitFor({ state: 'detached', timeout: 60_000 });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-welcome.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '关闭音乐', exact: true }).click();
  await expect(page.getByRole('button', { name: '开启音乐', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: '开启音乐', exact: true }).click();
  await enter(page, false);
  // Gift is physically reachable at the entrance, but remains story-locked.
  await page.waitForTimeout(2100);
  if (await page.locator('.interact-prompt').filter({ hasText: '生日礼物' }).count()) {
    await page.locator('.interact-prompt').click();
    await expect(page.getByRole('status')).toContainText('惊喜还在悄悄准备');
  }
  await guide(page, '书架上的三本书');
  await page.getByRole('button', { name: '傍晚的云霞', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('好像有一点不对');
  await expect(page.getByLabel('进度 0/5', { exact: true })).toBeVisible();
  for (const name of ['清晨的绿叶', '午后的日光', '傍晚的云霞'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name: '下一站，晴天', exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-blessing.png` });
  await keep(page, 1);
  await guide(page, '窗边的抽屉');
  await page.getByLabel('三位数字密码', { exact: true }).fill('123');
  await page.getByRole('button', { name: '打开抽屉', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('时间好像还没对上');
  await page.getByLabel('三位数字密码', { exact: true }).fill('420');
  await page.getByRole('button', { name: '打开抽屉', exact: true }).click();
  await expect(page.getByRole('heading', { name: '你值得被好好记得' })).toBeVisible();
  await keep(page, 2);
  await page.reload();
  await expect(page.getByRole('button', { name: '继续上次的探索' })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole('button', { name: '继续上次的探索' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('进度 2/5', { exact: true })).toBeVisible();
  await guide(page, '窗台上的小绿芽');
  await page.getByRole('button', { name: '收下这份勇气' }).click();
  await keep(page, 3);
  await guide(page, '沙发上的抱枕');
  await page.getByRole('button', { name: '收好小钥匙' }).click();
  await keep(page, 4);
  await expect(page.locator('.key-inventory')).toBeVisible();
  await guide(page, '黑胶唱片机');
  await page.getByRole('button', { name: '轻轻放下唱针' }).click();
  await keep(page, 5);
  await page.getByRole('button', { name: '已收集的心意 5/5' }).click();
  await expect(page.locator('.journal-item.done')).toHaveCount(5);
  await page.getByRole('button', { name: '合上卡片' }).click();
  await page.getByRole('button', { name: '切换夜晚' }).click();
  await expect(page.getByRole('button', { name: '切换白天' })).toBeVisible();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-night.png` });
  await page.getByRole('button', { name: '切换白天' }).click();
  await guide(page, '给你的生日礼物');
  await page.getByRole('button', { name: '打开生日礼物' }).click();
  await expect(page.locator('.opening-caption')).toBeVisible();
  await expect(page.locator('canvas')).toHaveAttribute('data-cake-scale', /0\.[1-8]\d{2}/, { timeout: 8000 });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-unfolding.png` });
  await expect(page.getByRole('button', { name: '许好啦，吹灭蜡烛' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveAttribute('data-cake-scale', '1.000');
  await expect(page.locator('canvas')).toHaveAttribute('data-candle-lit', 'true');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-cake.png` });
  await page.getByRole('button', { name: '许好啦，吹灭蜡烛' }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-candle-lit', 'false');
  await expect(page.getByRole('heading', { name: /亲爱的你.*生日快乐/ })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-greeting.png` });
  await page.getByRole('button', { name: '再看一遍' }).click();
  await expect(page.locator('.opening-caption')).toBeVisible();
  await expect(page.getByRole('button', { name: '许好啦，吹灭蜡烛' })).toBeVisible();
  await testInfo.attach('renderer-observations', {
    body: JSON.stringify(
      await page
        .locator('canvas')
        .evaluate((el) => ({ fps: el.dataset.fps, drawCalls: el.dataset.drawCalls })),
    ),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await page.getByRole('button', { name: '重新探索小屋', exact: true }).click();
  await expect(page.getByRole('button', { name: '走进小屋', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '已收集的心意 0/5', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await testInfo.attach('console-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
});

test('real desktop keyboard movement and mouse look obey collisions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await enter(page);
  await page.waitForTimeout(2200);
  const canvas = page.locator('canvas');
  const before = Number(await canvas.getAttribute('data-player-z'));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3200);
  await page.keyboard.up('KeyW');
  const x = Number(await canvas.getAttribute('data-player-x')),
    z = Number(await canvas.getAttribute('data-player-z'));
  expect(z).toBeLessThan(before - 0.5);
  expect(z).toBeGreaterThan(1.2);
  expect(isWalkable(x, z)).toBe(true);
  await page.keyboard.down('KeyS');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-player-z')), { timeout: 15_000 })
    .toBeGreaterThan(3.5);
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyS');
  const wallZ = Number(await canvas.getAttribute('data-player-z'));
  expect(wallZ).toBeLessThanOrEqual(3.73);
  expect(wallZ).toBeGreaterThan(3.5);
  const oldYaw = Number(await canvas.getAttribute('data-yaw'));
  await page.mouse.move(700, 500);
  await page.mouse.down();
  await page.mouse.move(890, 490, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs(Number(await canvas.getAttribute('data-yaw')) - oldYaw))
    .toBeGreaterThan(0.3);
});

test('touch joystick, touch look and landscape keep controls usable', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await enter(page);
  await page.waitForTimeout(2200);
  const canvas = page.locator('canvas'),
    oldZ = Number(await canvas.getAttribute('data-player-z'));
  const session = await context.newCDPSession(page),
    stick = await page.getByLabel('移动摇杆').boundingBox();
  if (!stick) throw new Error('joystick is not visible');
  const x = stick.x + stick.width / 2,
    y = stick.y + stick.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 32 }] });
  await page.waitForTimeout(700);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => Number(await canvas.getAttribute('data-player-z'))).toBeLessThan(oldZ - 0.5);
  const oldYaw = Number(await canvas.getAttribute('data-yaw'));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 390 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 230, y: 390 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(async () => Math.abs(Number(await canvas.getAttribute('data-yaw')) - oldYaw))
    .toBeGreaterThan(0.2);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole('button', { name: '操作帮助' })).toBeVisible();
  await page.getByRole('button', { name: '操作帮助' }).tap();
  await expect(page.getByRole('heading', { name: '自在一点，就很好' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-landscape-help.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('WebGL unavailable gives an actionable fallback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof getContext>) {
      if (String(args[0]).includes('webgl')) return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('小屋需要一点图形支持', { timeout: 40_000 });
  await expect(page.getByRole('button', { name: '再试一次' })).toBeVisible();
});
