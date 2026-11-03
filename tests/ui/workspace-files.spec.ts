import { test, expect, type Page } from '@playwright/test';

async function installFiles(page: Page) {
  await page.addInitScript(() => {
    const root = { id: 'root', name: 'output', relativePath: '', kind: 'directory' as const, previewKind: 'unsupported' as const };
    const folder = { ...root, id: 'scenes', name: 'scenes', relativePath: 'scenes' };
    const video = { id: 'clip', name: 'greeting.mp4', relativePath: 'scenes/greeting.mp4', kind: 'file' as const, previewKind: 'video' as const };
    const source = { id: 'source', name: 'scene.html', relativePath: 'scene.html', kind: 'file' as const, previewKind: 'text' as const };
    window.meStudioFiles = {
      projects: async () => [], pickProjectFolder: async () => null, createProject: async () => ({id:'project',name:'test'}), relinkProject: async () => null, activateProject: async () => ({ directory: root, entries: [folder, source], truncated: false }),
      chooseFolder: async () => ({ directory: root, entries: [folder, source], truncated: false }),
      listFolder: async ({ id }) => id === 'scenes'
        ? { directory: folder, entries: [video], truncated: false }
        : { directory: root, entries: [folder, source], truncated: false },
      openFile: async ({ id }) => id === 'clip'
        ? { entry: video, kind: 'video', bytes: 10, src: '/demos/greeting.mp4' }
        : { entry: source, kind: 'text', bytes: 40, text: '<script>window.untrustedSourceRan = true</script>' },
    };
  });
}

test('selected-folder tree opens media beside chat and preserves draft and folder across panel close', async ({ page }) => {
  await installFiles(page);
  await page.goto('/desktop');
  const panel = page.getByRole('region', { name: 'ไฟล์และพรีวิว', exact: true });
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await expect(panel).toHaveCount(0);
  await input.fill('ข้อความที่ยังไม่ได้ส่ง');
  await page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true }).click();
  await panel.getByRole('button', { name: 'เลือกโฟลเดอร์', exact: true }).click();
  await page.getByRole('treeitem', { name: 'scenes', exact: true }).click();
  await page.getByRole('treeitem', { name: 'greeting.mp4', exact: true }).click();
  await expect(panel.locator('video')).toHaveJSProperty('readyState', 4);
  await expect(panel.locator('video')).toHaveAttribute('controls', '');
  // Native media uses range responses; browser fixture verifies the same player can seek.
  await panel.locator('video').evaluate((video: HTMLVideoElement) => { video.currentTime = 3; });
  await expect.poll(() => panel.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThanOrEqual(3);
  const nav = page.getByRole('navigation', { name: 'แถบนำทางหลัก' });
  await expect(nav.getByLabel('แท็บไฟล์ greeting.mp4')).toBeVisible();
  await panel.locator('video').evaluate(video => { video.dataset.originalPlayer = 'true'; });
  await panel.getByRole('button', { name: 'ซ่อนรายการไฟล์', exact: true }).click();
  await expect(panel.getByRole('complementary', { name: 'รายการไฟล์' })).toBeHidden();
  await expect(panel.locator('video')).toHaveAttribute('data-original-player', 'true');
  await expect.poll(() => panel.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThanOrEqual(3);
  await panel.getByRole('button', { name: 'แสดงรายการไฟล์', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'scene.html', exact: true })).toBeVisible();
  await expect(input).toHaveValue('ข้อความที่ยังไม่ได้ส่ง');
  await panel.getByRole('button', { name: 'ปิดแผงไฟล์', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true }).click();
  await expect(panel.locator('video')).toHaveJSProperty('readyState', 4);
  await panel.getByRole('button', { name: 'ปิดไฟล์ greeting.mp4', exact: true }).click();
  await page.getByRole('treeitem', { name: 'scene.html', exact: true }).click();
  await expect(panel.locator('pre')).toContainText('<script>window.untrustedSourceRan');
  expect(await page.evaluate(() => 'untrustedSourceRan' in window)).toBe(false);
  await panel.getByRole('button', { name: 'ปิดไฟล์ scene.html', exact: true }).click();
  await panel.getByRole('textbox', { name: 'กรองไฟล์ในรายการ' }).fill('missing-file');
  await expect(page.getByRole('treeitem', { name: 'scene.html', exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'ปิดแผงไฟล์', exact: true }).click();
  await input.fill('ทำคลิปตัวอย่าง');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true }).click();
  await page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'ดูผลงาน', exact: true })).toBeVisible();
});

test('global navigation controls the history sidebar and compact rail without losing the draft', async ({ page }) => {
  await page.goto('/desktop');
  const nav = page.getByRole('navigation', { name: 'แถบนำทางหลัก' });
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await input.fill('ร่างสำหรับทดสอบ navigation');
  await nav.getByRole('button', { name: 'ยุบแถบด้านข้าง', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'แถบด้านข้าง', exact: true })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'แถบเครื่องมือแชต', exact: true })).toBeVisible();
  await expect(input).toHaveValue('ร่างสำหรับทดสอบ navigation');
  await nav.getByRole('button', { name: 'เปิดแถบด้านข้าง', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'แถบด้านข้าง', exact: true })).toBeVisible();
  await expect(input).toHaveValue('ร่างสำหรับทดสอบ navigation');
  await nav.getByRole('button', { name: 'เริ่มแชตใหม่', exact: true }).click();
  await expect(input).toHaveValue('');
  await page.getByRole('button', { name: 'เปิดแชต ร่างสำหรับทดสอบ navigation', exact: true }).click();
  await expect(input).toHaveValue('ร่างสำหรับทดสอบ navigation');
});

test('narrow files panel switches between tree and video without overflow', async ({ page }) => {
  await installFiles(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desktop');
  await page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true }).click();
  const panel = page.getByRole('region', { name: 'ไฟล์และพรีวิว', exact: true });
  await panel.getByRole('button', { name: 'เลือกโฟลเดอร์', exact: true }).click();
  await page.getByRole('treeitem', { name: 'scenes', exact: true }).click();
  await page.getByRole('treeitem', { name: 'greeting.mp4', exact: true }).click();
  await expect(panel.locator('video')).toBeVisible();
  await expect(panel.getByRole('complementary', { name: 'รายการไฟล์' })).toBeHidden();
  await panel.getByRole('button', { name: 'แสดงรายการไฟล์', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'scene.html', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'กลับไปดูไฟล์', exact: true }).click();
  await expect(panel.locator('video')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.getByRole('button', { name: 'ปิดแผงไฟล์', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' })).toBeVisible();
});

test('ordinary web preview explains that local-folder access needs the desktop app', async ({ page }) => {
  await page.goto('/desktop');
  await page.getByRole('button', { name: 'เปิดแผงไฟล์', exact: true }).click();
  await page.getByRole('button', { name: 'เลือกโฟลเดอร์', exact: true }).click();
  await expect(page.getByRole('region', { name: 'ไฟล์และพรีวิว', exact: true }).getByRole('alert')).toContainText('แอป');
  await expect(page.getByRole('tree')).toHaveCount(0);
});
