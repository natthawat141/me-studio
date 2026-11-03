import { test, expect } from '@playwright/test';

test('search palette groups actions and recent chats, filters categories and supports keyboard navigation', async ({ page }) => {
  await page.goto('/desktop');
  const composer = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await composer.fill('คลิปร้านกาแฟ');
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: 'ค้นหาแชตหรือใช้คำสั่ง' });
  const search = palette.getByRole('combobox', { name: 'ค้นหาในประวัติแชต' });
  await expect(search).toBeFocused();
  await expect(palette.getByRole('group', { name: 'คำสั่งด่วน', exact: true })).toBeVisible();
  await expect(palette.getByRole('option', { name: 'คลิปร้านกาแฟ', exact: true })).toBeVisible();
  await search.fill('กาแฟ');
  await expect(palette.getByRole('option', { name: 'แชตใหม่', exact: true })).toHaveCount(0);
  await search.press('Enter');
  await expect(palette).toHaveCount(0);
  await expect(composer).toHaveValue('คลิปร้านกาแฟ');
  await page.keyboard.press('Meta+k');
  await palette.getByRole('tab', { name: 'คำสั่ง', exact: true }).click();
  await expect(palette.getByRole('option', { name: 'คลิปร้านกาแฟ', exact: true })).toHaveCount(0);
  await search.focus();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByRole('dialog', { name: 'ตั้งค่า', exact: true })).toBeVisible();
});

test('search files open the existing artifact and IME Enter does not execute an action', async ({ page }) => {
  await page.goto('/desktop');
  const composer = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await composer.fill('ทำคลิปตัวอย่าง');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true })).toBeVisible();
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: 'ค้นหาแชตหรือใช้คำสั่ง' });
  const search = palette.getByRole('combobox', { name: 'ค้นหาในประวัติแชต' });
  await search.fill('แชตใหม่');
  await search.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(palette).toBeVisible();
  await search.fill('');
  await palette.getByRole('tab', { name: 'ข้อความ', exact: true }).click();
  await search.fill('กลับมาคุยต่อ');
  await palette.getByRole('option', { name: /^ข้อความ / }).click();
  await expect(page.locator('.message-assistant')).toBeInViewport();
  await page.keyboard.press('Meta+k');
  await palette.getByRole('tab', { name: 'ไฟล์', exact: true }).click();
  await palette.getByRole('option', { name: 'ไฟล์ วิดีโอตัวอย่าง', exact: true }).click();
  await expect(palette).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toBeVisible();
});

test('mobile palette fits, has a useful empty state and Escape restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desktop');
  const composer = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await composer.focus();
  await page.keyboard.press('Meta+k');
  const search = page.getByRole('combobox', { name: 'ค้นหาในประวัติแชต' });
  await search.fill('ไม่มีผลลัพธ์ที่ตรงกัน');
  await expect(page.getByText('ไม่พบผลลัพธ์', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(composer).toBeFocused();
});
