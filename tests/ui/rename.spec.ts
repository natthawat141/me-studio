import { test, expect } from '@playwright/test';

test('studio rename stays inline: Enter saves, Escape cancels, blur saves and blank blur restores',async({page},testInfo)=>{
  await page.goto('/');
  await page.getByRole('button',{name:'เปลี่ยนชื่อ โปรเจกต์ใหม่',exact:true}).click();
  const input=page.getByRole('textbox',{name:'ชื่อโปรเจกต์',exact:true});
  await expect(input).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await input.fill('เรื่องใหม่ของฉัน');
  await page.screenshot({path:testInfo.outputPath('inline-desktop.png')});
  await input.press('Enter');
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อ เรื่องใหม่ของฉัน',exact:true})).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('me-studio.workspace.v1')!).projects.find((p:{id:string})=>p.id==='start').title)).toBe('เรื่องใหม่ของฉัน');
  await page.getByRole('button',{name:'เปลี่ยนชื่อ เรื่องใหม่ของฉัน',exact:true}).click();
  await input.fill('อย่าบันทึก');await input.press('Escape');
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อ เรื่องใหม่ของฉัน',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'เปลี่ยนชื่อ เรื่องใหม่ของฉัน',exact:true}).click();
  await input.fill('  บันทึกเมื่อคลิกออก  ');await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).click();
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อ บันทึกเมื่อคลิกออก',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'เปลี่ยนชื่อ บันทึกเมื่อคลิกออก',exact:true}).click();
  await input.fill(' ');await input.press('Enter');await expect(page.getByText('กรุณาใส่ชื่อโปรเจกต์',{exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).click();
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อ บันทึกเมื่อคลิกออก',exact:true})).toBeVisible();
});

test('project list rename commits locally and retains editor on save failure',async({page})=>{
  await page.goto('/projects');
  await page.getByRole('button',{name:'เปลี่ยนชื่อ ทักทายยามเช้า',exact:true}).click();
  const input=page.getByRole('textbox',{name:'ชื่อโปรเจกต์',exact:true});
  await input.fill('ชื่อในตาราง');await input.press('Enter');
  await expect(page.getByRole('button',{name:'เปลี่ยนชื่อ ชื่อในตาราง',exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'เปลี่ยนชื่อ ชื่อในตาราง',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('Synthetic quota failure');};});
  await input.fill('บันทึกไม่สำเร็จ');await input.press('Enter');
  await expect(input).toBeVisible();await expect(input).toHaveValue('บันทึกไม่สำเร็จ');
  await expect(page.getByText('บันทึกชื่อไม่สำเร็จ ลองอีกครั้ง', {exact:true})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mobile IME Enter does not accidentally commit the name',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'เปลี่ยนชื่อ โปรเจกต์ใหม่',exact:true}).click();
  const input=page.getByRole('textbox',{name:'ชื่อโปรเจกต์',exact:true});
  await input.fill('ชื่อภาษาไทย');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});
  await expect(input).toBeVisible();await expect(input).toHaveValue('ชื่อภาษาไทย');
  await page.screenshot({path:testInfo.outputPath('inline-mobile.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await input.press('Enter');await expect(input).toHaveCount(0);
});

test('current model candidates retain exact provider identity in chat',async({page},testInfo)=>{
  await page.goto('/settings?section=models');
  await page.getByRole('button',{name:'Muse Wonder · Meta API',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('me-studio.chat-model.v1')!).provider)).toBe('meta');
  await page.screenshot({path:testInfo.outputPath('model-settings.png')});
  await page.getByRole('link',{name:'กลับไปที่สตูดิโอ'}).click();
  await expect(page.getByRole('combobox',{name:'เลือกโมเดลแชต'})).toContainText('Muse Wonder');
  await page.goto('/settings?section=models');
  await page.getByRole('button',{name:'Claude Haiku 5.5',exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('me-studio.chat-model.v1')!).modelId)).toBe('anthropic/claude-haiku-5.5');
});
