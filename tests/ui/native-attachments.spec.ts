import {test,expect,type Page} from '@playwright/test';
import {initialChatState} from '../../src/lib/chat-prototype';
async function setup(page:Page,legacy=false,configured=true){
 await page.addInitScript(({seed,legacy,configured})=>{
  localStorage.setItem('me-studio.chat-ui.v1',JSON.stringify({...seed,selectedProvider:'openai',...(legacy?{threads:[{id:'22222222-2222-4222-8222-222222222222',title:'บรีฟเก่า',draft:'',updatedAt:1,messages:[{id:'old-brief',role:'user',text:'ช่วยคิดเรื่องจากภาพนี้ ยังไม่ต้องสร้าง',files:[{id:'11111111-1111-4111-8111-111111111111',name:'scene-1.jpg',relativePath:'scene-1.jpg',kind:'image'}]}]}]}:{})}));
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>{throw Error();},chooseFolder:async()=>null,listFolder:async()=>{throw Error();},openFile:async()=>{throw Error();},
   storeChatFile:async()=>({id:'11111111-1111-4111-8111-111111111111',name:'scene-1.jpg',relativePath:'scene-1.jpg',kind:'image'}),
   chatFile:async()=>({entry:{id:'local',name:'scene-1.jpg',relativePath:'scene-1.jpg',kind:'file',previewKind:'image'},kind:'image',bytes:3,src:'/demos/storyboard/scene-1.jpg'}),
   videoStatus:async()=>({configured,busy:false}),produceVideo:async input=>{sessionStorage.setItem('sentAttachmentRequest',JSON.stringify(input));return {text:'ได้รับบรีฟและภาพแล้ว เราคุยแนวทางกันก่อน'};}
  };
 },{seed:initialChatState,legacy,configured});
 await page.goto('/desktop');
}
test('native text with an image reaches AI and later turns retain the image reference',async({page})=>{
 await setup(page);const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
 await input.fill('ช่วยคิดเรื่องจากภาพนี้ ยังไม่ต้องสร้าง');await page.locator('input[type="file"]').setInputFiles('public/demos/storyboard/scene-1.jpg');await input.press('Enter');
 await expect(page.getByRole('log')).toContainText('ได้รับบรีฟและภาพแล้ว');
 const request=JSON.parse((await page.evaluate(()=>sessionStorage.getItem('sentAttachmentRequest')))!);
 expect(request.text).toContain('ยังไม่ต้องสร้าง');expect(request.attachments).toEqual([{id:'11111111-1111-4111-8111-111111111111'}]);
 await expect(page.getByRole('log').getByAltText('scene-1.jpg')).toBeVisible();
 await expect(page.getByRole('button',{name:'ส่งข้อความนี้ให้ AI'})).toHaveCount(0);
 await input.fill('ขอแนวทางอีกแบบ');await input.press('Enter');
 await expect(page.getByRole('log').locator('.message-assistant')).toHaveCount(2);
 expect(JSON.parse((await page.evaluate(()=>sessionStorage.getItem('sentAttachmentRequest')))!)).toMatchObject({text:'ขอแนวทางอีกแบบ',attachments:request.attachments});
});

test('old local-only attachment messages can be resent while preserving a current draft',async({page})=>{
 await setup(page,true);
 await page.getByRole('button',{name:'เปิดแชต บรีฟเก่า',exact:true}).click();
 const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});await input.fill('ร่างนี้ต้องยังอยู่');
 await page.getByRole('button',{name:'ส่งข้อความนี้ให้ AI',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('ได้รับบรีฟและภาพแล้ว');
 await expect(input).toHaveValue('ร่างนี้ต้องยังอยู่');
 const request=JSON.parse((await page.evaluate(()=>sessionStorage.getItem('sentAttachmentRequest')))!);
 expect(request).toMatchObject({text:'ช่วยคิดเรื่องจากภาพนี้ ยังไม่ต้องสร้าง',attachments:[{id:'11111111-1111-4111-8111-111111111111'}]});
 await expect(page.getByRole('log').locator('.message-user')).toHaveCount(2);
});
test('unconfigured native image send keeps both draft and attachment without a fake reply',async({page})=>{
 await setup(page,false,false);
 const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});await input.fill('อย่าทำบรีฟนี้หาย');
 await page.locator('input[type="file"]').setInputFiles('public/demos/storyboard/scene-1.jpg');await input.press('Enter');
 await expect(page.getByRole('status').filter({hasText:'โหลดคีย์'})).toBeVisible();
 await expect(input).toHaveValue('อย่าทำบรีฟนี้หาย');await expect(page.getByAltText('ภาพแนบ scene-1.jpg')).toBeVisible();
 await expect(page.getByRole('log').locator('.message-user')).toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem('sentAttachmentRequest'))).toBeNull();
});
