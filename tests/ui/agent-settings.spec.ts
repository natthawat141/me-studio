import {test,expect} from '@playwright/test';

test('gear opens project settings without a video; changes persist per project',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'เปิดคลังไฟล์',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'การตั้งค่า Agent',exact:true}).click();
  const panel=page.getByRole('region',{name:'การตั้งค่า Agent',exact:true});
  await expect(panel).toBeVisible();
  await expect(page.getByRole('region',{name:'วิดีโอ',exact:true})).toHaveCount(0);
  await panel.getByRole('group',{name:'สัดส่วนวิดีโอ',exact:true}).getByRole('radio',{name:'9:16',exact:true}).check();
  await panel.getByRole('group',{name:'จำนวนวิดีโอ',exact:true}).getByRole('radio',{name:'×2',exact:true}).check();
  await panel.getByRole('combobox',{name:'โมเดลแชตของโปรเจกต์'}).click();
  await page.getByRole('option',{name:'Muse Wonder · Meta API',exact:true}).click();
  await expect(page.getByRole('listbox')).toBeHidden();
  const modelPicker = panel.getByRole('combobox',{name:'โมเดลแชตของโปรเจกต์'});
  await modelPicker.click();
  await expect(modelPicker).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');await expect(panel).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('agent-settings-desktop.png')});
  await page.getByRole('button',{name:'เสร็จสิ้น',exact:true}).click();
  await expect(page.getByRole('button',{name:'การตั้งค่า Agent',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'สร้างโปรเจกต์ใหม่',exact:true}).click();
  await page.getByRole('button',{name:'การตั้งค่า Agent',exact:true}).click();
  await expect(panel.getByRole('group',{name:'สัดส่วนวิดีโอ',exact:true}).getByRole('radio',{name:'16:9',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'ปิดการตั้งค่า Agent'}).click();
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('me-studio.workspace.v1')!).projects.find((p:{id:string})=>p.id==='start').agentSettings.video.aspectRatio)).toBe('9:16');
});

test('settings pause and restore the existing video without replacing its element',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'ทักทายยามเช้า',exact:true}).click();
  const video=page.locator('.video-pane video');await expect(video).toBeVisible();
  await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.readyState)).toBeGreaterThan(0);
  await video.evaluate((element:HTMLVideoElement)=>{element.currentTime=2;});
  const original=await video.elementHandle();
  await page.getByRole('button',{name:'การตั้งค่า Agent',exact:true}).click();
  await expect(video).toBeHidden();
  await page.getByRole('button',{name:'กลับไปดูวิดีโอ'}).click();
  await expect(video).toBeVisible();
  expect(await video.evaluate((element,other)=>element===other,original)).toBe(true);
  expect(await video.evaluate((element:HTMLVideoElement)=>element.currentTime)).toBeGreaterThanOrEqual(1.8);
});

test('mobile settings contain focus, scroll, close with Escape and do not open a video',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'การตั้งค่า Agent',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'การตั้งค่า Agent',exact:true});await expect(dialog).toBeVisible();
  await page.getByRole('button',{name:'เสร็จสิ้น',exact:true}).focus();await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'กลับไปที่แชต'})).toBeFocused();
  await page.screenshot({path:testInfo.outputPath('agent-settings-mobile.png')});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'การตั้งค่า Agent',exact:true})).toBeFocused();
  await expect(page.locator('.video-pane')).toHaveCount(0);
});

test('tablet settings fit next to chat without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:768,height:1024});await page.goto('/');
  await page.getByRole('button',{name:'การตั้งค่า Agent',exact:true}).click();
  await expect(page.getByRole('region',{name:'การตั้งค่า Agent',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(768);
});
