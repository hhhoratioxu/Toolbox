import { test, expect } from '@playwright/test';

test('final layout, saved-progress entry, focused-input Escape and help remain usable', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // This focused regression starts from the same valid save written by puzzle one.
  // The main room.spec.ts completes every puzzle without seeding progress.
  await page.addInitScript(() => {
    localStorage.setItem(
      'birthday-room-v1',
      JSON.stringify({
        state: {
          solved: ['books'],
          hasKey: false,
          recordPlaying: false,
          phase: 'explore',
          music: true,
          night: false,
        },
        version: 1,
      }),
    );
  });
  await page.goto('/');
  await page.locator('.loading-curtain').waitFor({ state: 'detached', timeout: 60_000 });
  await page.waitForTimeout(1800);
  await expect(page.getByRole('button', { name: '继续上次的探索' })).toBeInViewport();
  await page.screenshot({ path: `artifacts/${info.project.name}-final-welcome.png` });
  await page.getByRole('button', { name: '继续上次的探索' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '线索提示', exact: true }).click();
  await page.getByRole('button', { name: '带我去看看', exact: true }).click();
  await expect(page.locator('.interact-prompt')).toContainText('窗边的抽屉', { timeout: 25_000 });
  await page.locator('.interact-prompt').click();
  await page.getByLabel('三位数字密码', { exact: true }).fill('42');
  await page.getByLabel('三位数字密码', { exact: true }).press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await expect(page.getByLabel('进度 1/5', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '操作帮助' }).click();
  if (info.project.name !== 'desktop-chromium') await page.setViewportSize({ width: 844, height: 390 });
  await page.getByLabel('画面细腻程度').selectOption('low');
  await page.getByRole('button', { name: '知道啦，继续探索' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: '知道啦，继续探索' })).toBeInViewport();
  await page.getByRole('button', { name: '知道啦，继续探索' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
