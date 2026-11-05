import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('defaults to English and preserves the selected language', async ({ page }) => {
  await page.goto('/desktop');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('th');
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.getByRole('tab', { name: 'ทั่วไป' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'ภาษา' })).toHaveValue('th');
  await page.getByRole('combobox', { name: 'ภาษา' }).selectOption('en');
  await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
});
