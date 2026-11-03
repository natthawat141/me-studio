import {test,expect} from '@playwright/test';

test('sending an attachment with Enter returns focus to the composer and repeated Enter stays there',async({page})=>{
 await page.addInitScript(()=>{
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>{throw Error();},chooseFolder:async()=>null,listFolder:async()=>{throw Error();},openFile:async()=>{throw Error();},
   storeChatFile:async()=>{await new Promise(r=>setTimeout(r,100));return {id:'11111111-1111-4111-8111-111111111111',name:'scene-1.jpg',relativePath:'scene-1.jpg',kind:'image'};},
   chatFile:async()=>({entry:{id:'local',name:'scene-1.jpg',relativePath:'scene-1.jpg',kind:'file',previewKind:'image'},kind:'image',bytes:3,src:'/demos/storyboard/scene-1.jpg'})
  };
 });
 await page.goto('/desktop');
 const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
 await input.fill('ตรวจโฟกัส');await page.locator('input[type="file"]').setInputFiles('public/demos/storyboard/scene-1.jpg');
 await input.press('Enter');await expect(page.getByRole('log').getByAltText('scene-1.jpg')).toBeVisible();
 await expect(input).toBeFocused();
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(input).toBeFocused();
 await expect(page.getByRole('log').locator('.message-user')).toHaveCount(1);
 await page.getByRole('button',{name:'แชตใหม่',exact:true}).click();await expect(input).toBeFocused();
 await page.getByRole('button',{name:'เปิดแชต ตรวจโฟกัส',exact:true}).click();await expect(input).toBeFocused();
});

test('image thumbnails appear before sending, survive chat switching, paste and removal',async({page})=>{
 await page.goto('/desktop');
 const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
 await input.fill('ร่างภาพ');
 await page.locator('input[type="file"]').setInputFiles('public/demos/storyboard/scene-1.jpg');
 const thumb=page.getByAltText('ภาพแนบ scene-1.jpg');
 await expect(thumb).toBeVisible();await expect.poll(()=>thumb.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'แชตใหม่',exact:true}).click();await expect(thumb).toHaveCount(0);
 await page.getByRole('button',{name:'ค้นหาแชต ⌘ K'}).click();
 await page.getByRole('combobox',{name:'ค้นหาในประวัติแชต'}).fill('ร่างภาพ');
 await page.getByRole('option',{name:'ร่างภาพ',exact:true}).click();await expect(thumb).toBeVisible();
 await input.evaluate(async element=>{
  const bytes=await(await fetch('/demos/storyboard/scene-1.jpg')).blob();
  const clipboard=new DataTransfer();clipboard.items.add(new File([bytes],'pasted.jpg',{type:'image/jpeg'}));
  element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:clipboard}));
 });
 await expect(page.getByAltText('ภาพแนบ pasted.jpg')).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'ยุบแถบด้านข้าง',exact:true}).click();
 const composer=page.locator('.chat-composer');
 expect(await composer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'.studio/frontend-review/composer-image-thumbnails.png'});
 await page.getByRole('button',{name:'นำ scene-1.jpg ออก',exact:true}).click();await expect(thumb).toHaveCount(0);
 await expect(page.getByAltText('ภาพแนบ pasted.jpg')).toBeVisible();
});
