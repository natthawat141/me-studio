import {test,expect} from '@playwright/test';
for(const mode of ['partial','timeout'] as const)test(`${mode} failure explains actual cause, keeps partial output and settles busy UI`,async({page})=>{
 await page.addInitScript(mode=>{
  let callback:((event:import('../../src/lib/workspace-files').ProductionEvent)=>void)|undefined;
  const directory={id:'root',name:'synthetic',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,relinkProject:async()=>null,createProject:async()=>({id:'x',name:'x'}),activateProject:async()=>({directory,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory,entries:[],truncated:false}),openFile:async()=>{throw Error();},videoStatus:async()=>({configured:true,busy:false}),onProductionEvent:cb=>{callback=cb;return()=>{};},produceVideo:async input=>{
   callback?.({kind:'production',type:'activity',sessionId:input.sessionId,requestId:input.requestId,operationId:'one',action:'write',relativePath:'preview.html',status:'started'});
   if(mode==='timeout')throw Error('DESKTOP_REQUEST_TIMEOUT');
   return {status:'failed',errorCode:'CONTEXT_LIMIT',text:'',files:[{id:'11111111-1111-4111-8111-111111111111',name:'preview.html',relativePath:'preview.html',kind:'text'}]};
  }};
 },mode);
 await page.goto('/desktop');await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).fill('สร้างตัวอย่าง');await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 const log=page.getByRole('log');await expect(log).toContainText(mode==='partial'?'บริบท':'ใช้เวลานาน');await expect(log).not.toContainText('ตรวจการเชื่อมต่อ AI');
 if(mode==='partial')await expect(log.getByRole('button',{name:'เปิดไฟล์ preview.html'})).toBeVisible();
 await expect(page.getByRole('button',{name:'หยุดตอบ'})).toHaveCount(0);
 await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).fill('ลองต่อ');await expect(page.getByRole('button',{name:'ส่งข้อความ',exact:true})).toBeEnabled();
});
test('Stop retains saved intermediate files in the original message without opening or overwriting newer work',async({page})=>{
 await page.addInitScript(()=>{
  const directory={id:'root',name:'synthetic',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};let calls=0;
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,relinkProject:async()=>null,createProject:async()=>({id:'x',name:'x'}),activateProject:async()=>({directory,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory,entries:[],truncated:false}),openFile:async()=>{throw Error();},videoStatus:async()=>({configured:true,busy:false}),cancelVideo:async()=>({}),produceVideo:async()=>{
   if(++calls>1)return {text:'newer answer'};
   return new Promise(resolve=>window.addEventListener('finish-stopped',()=>resolve({status:'cancelled',errorCode:'CANCELLED',text:'',files:[...Array.from({length:9},(_,i)=>({id:`22222222-2222-4222-8222-22222222222${i}`,name:`other-${i}.html`,relativePath:`other-${i}.html`,kind:'text' as const})),{id:'11111111-1111-4111-8111-111111111111',name:'saved.html',relativePath:'saved.html',kind:'text'}],artifact:{id:'33333333-3333-4333-8333-333333333333',title:'saved',hasVoice:false,url:'studio-media://saved/video.mp4',files:[{id:'44444444-4444-4444-8444-444444444444',name:'saved.mp4',relativePath:'saved.mp4',kind:'video'}]},openFile:{id:'11111111-1111-4111-8111-111111111111',name:'saved.html',relativePath:'saved.html',kind:'text'}}),{once:true}));
  }};
 });
 await page.goto('/desktop');const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});await input.fill('first request');await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 await page.getByRole('button',{name:'หยุดตอบ'}).click();await expect(page.getByRole('log')).toContainText('หยุดแล้ว');
 await input.fill('second request');await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();await expect(page.getByRole('log')).toContainText('newer answer');
 await page.evaluate(()=>window.dispatchEvent(new Event('finish-stopped')));
 await expect(page.getByRole('log').getByRole('button',{name:'เปิดไฟล์ saved.html'})).toBeVisible();
 await expect(page.getByRole('log')).toContainText('newer answer');await expect(page.getByRole('region',{name:'ไฟล์และพรีวิว'})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('me-studio.chat-ui.v1')??'')).toContain('saved.html');await page.reload();
 await expect(page.getByText('อ่านประวัติแชตไม่สำเร็จ ข้อมูลเดิมจะไม่ถูกเขียนทับ')).toHaveCount(0);
 await page.getByRole('button',{name:'เปิดแชต first request',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('newer answer');await expect(page.getByRole('log').getByRole('button',{name:'เปิดไฟล์ saved.html'})).toBeVisible();
});
