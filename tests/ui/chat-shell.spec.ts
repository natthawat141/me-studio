import { test, expect } from '@playwright/test';

test('home is chat-first, has no scene form, and preview opens only on an artifact click', async ({ page }) => {
  await page.goto('/desktop');
  await expect(page.getByRole('heading', { name: 'me studio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'แชตใหม่', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toHaveCount(0);
  await expect(page.getByText('ตัวละครแรกพูด', { exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' }).fill('ทำคลิปแนะนำร้านกาแฟ');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toHaveCount(0);
  await page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true }).click();
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toBeVisible();
  await page.getByRole('button', { name: 'ปิดพรีวิว', exact: true }).click();
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' })).toBeVisible();
});

test('composer preserves IME input and independent drafts between chats', async ({ page }) => {
  await page.goto('/desktop');
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await input.fill('ร่างแรก');
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(input).toHaveValue('ร่างแรก');
  await page.getByRole('button', { name: 'แชตใหม่', exact: true }).click();
  await input.fill('ร่างที่สอง');
  await page.getByRole('button', { name: 'เปิดแชต ร่างแรก', exact: true }).click();
  await expect(input).toHaveValue('ร่างแรก');
});

test('settings offers multiple providers and persists no API key', async ({ page }) => {
  await page.goto('/desktop');
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await page.getByRole('tab', { name: 'ผู้ให้บริการ AI', exact: true }).click();
  for (const name of ['OpenRouter', 'OpenAI', 'Meta', 'กำหนดเอง']) await expect(page.getByRole('button', { name: `ตั้งค่า ${name}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ตั้งค่า OpenRouter', exact: true }).click();
  await expect(page.getByLabel('API key')).toBeDisabled();
  await page.getByLabel('ชื่อโมเดลที่แสดง').fill('โมเดลสำหรับทดลอง');
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ตั้งค่า OpenRouter', exact: true }).getByText('โมเดลสำหรับทดลอง', { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('me-studio.chat-ui.v1'));
  expect(stored).not.toContain('apiKey');
});

test('attachments and drafts stay with their chat; search restores the conversation', async ({ page }) => {
  await page.goto('/desktop');
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await input.fill('คลิปร้านกาแฟ');
  await page.locator('input[type="file"]').setInputFiles({ name: 'coffee.png', mimeType: 'image/png', buffer: Buffer.from('sample image') });
  await expect(page.getByRole('button', { name: 'นำ coffee.png ออก' })).toBeVisible();
  await page.getByRole('button', { name: 'แชตใหม่', exact: true }).click();
  await expect(page.getByRole('button', { name: 'นำ coffee.png ออก' })).toHaveCount(0);
  await page.getByRole('button', { name: 'เปิดแชต คลิปร้านกาแฟ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'นำ coffee.png ออก' })).toBeVisible();
  await expect(input).toHaveValue('คลิปร้านกาแฟ');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'แชตใหม่', exact: true }).click();
  await page.getByRole('button', { name: 'ค้นหาแชต ⌘ K' }).click();
  await page.getByRole('combobox', { name: 'ค้นหาในประวัติแชต' }).fill('กาแฟ');
  await page.getByRole('dialog').getByRole('option', { name: 'คลิปร้านกาแฟ', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('coffee.png');
  await page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true }).click();
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4);
  const resizer = page.getByRole('separator', { name: 'ปรับขนาดพรีวิว' });
  await resizer.press('ArrowLeft');
  await expect(resizer).toHaveAttribute('aria-valuenow', '464');
  await page.getByRole('button', { name: 'ปิดพรีวิว', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true })).toBeFocused();
});

test('mobile home, conversation and provider form remain reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desktop');
  await expect(page.getByRole('button', { name: 'เปิดแถบด้านข้าง' })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await input.fill('ทำวิดีโอตัวอย่าง');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true }).click();
  await expect(page.getByRole('region', { name: 'ดูผลงาน' })).toBeVisible();
  await page.getByRole('button', { name: 'ปิดพรีวิว', exact: true }).click();
  await page.getByRole('button', { name: 'เปิดแถบด้านข้าง' }).click();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await page.getByRole('tab', { name: 'ผู้ให้บริการ AI', exact: true }).click();
  await page.getByRole('button', { name: 'ตั้งค่า กำหนดเอง', exact: true }).click();
  await page.getByLabel('ชื่อโมเดลที่แสดง').fill('โมเดลทดสอบ');
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('unreadable chat history is not overwritten and legacy data is untouched', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('me-studio.chat-ui.v1', '{unreadable');
    localStorage.setItem('legacy-project-marker', 'preserve-me');
  });
  await page.goto('/desktop');
  await expect(page.getByRole('alert').filter({ hasText: 'ข้อมูลเดิมจะไม่ถูกเขียนทับ' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('me-studio.chat-ui.v1'))).toBe('{unreadable');
  expect(await page.evaluate(() => localStorage.getItem('legacy-project-marker'))).toBe('preserve-me');
});
