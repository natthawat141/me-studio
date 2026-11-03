import {test,expect} from '@playwright/test';
test('native video chat returns a real artifact, preserves project and reload resolves a fresh media grant',async({page})=>{
 await page.addInitScript(()=>{
  const directory={id:'root',name:'videos',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
  window.meStudioFiles={projects:async()=>[{id:'11111111-1111-4111-8111-111111111111',name:'ช่องทดสอบ'}],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>({directory,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory,entries:[],truncated:false}),openFile:async()=>{throw Error();},videoStatus:async()=>({configured:true,busy:false}),produceVideo:async()=>({text:'สร้างเสร็จแล้ว',artifact:{id:'22222222-2222-4222-8222-222222222222',title:'การ์ตูนของฉัน',url:'studio-media://33333333-3333-4333-8333-333333333333/video.mp4',hasVoice:true}}),videoArtifact:async()=>({id:'22222222-2222-4222-8222-222222222222',title:'การ์ตูนของฉัน',url:'studio-media://44444444-4444-4444-8444-444444444444/video.mp4'})};
 });
 await page.goto('/desktop');await page.getByRole('button',{name:'แชตใหม่ใน ช่องทดสอบ',exact:true}).click();
 // Choose the fixed live provider rather than silently routing a different provider.
 await page.getByRole('button',{name:'เลือกโมเดล'}).click();await page.getByRole('menuitem').filter({hasText:'OpenAI'}).click();
 await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).fill('สร้างการ์ตูนสั้น');await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('สร้างเสร็จแล้ว');await page.reload();await page.getByRole('button',{name:'เปิดแชต สร้างการ์ตูนสั้น'}).click();await page.getByRole('button',{name:'ดูการ์ตูนของฉัน'}).click();
 await expect(page.getByRole('log').locator('video')).toHaveAttribute('src','studio-media://44444444-4444-4444-8444-444444444444/video.mp4');
 await expect(page.getByRole('region',{name:'ดูผลงาน'}).locator('video')).toHaveAttribute('src','studio-media://44444444-4444-4444-8444-444444444444/video.mp4');
 await expect(page.getByRole('link',{name:/ดาวน์โหลด/})).toHaveCount(0);
});
test('local image, video and HTML attachments embed in chat and open in the file panel after reload',async({page})=>{
 await page.addInitScript(()=>{
  const kinds:Record<string,'image'|'video'|'text'>={'photo.png':'image','clip.mp4':'video','scene.html':'text'};
  const ids:Record<string,string>={'photo.png':'11111111-1111-4111-8111-111111111111','clip.mp4':'22222222-2222-4222-8222-222222222222','scene.html':'33333333-3333-4333-8333-333333333333'};
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>{throw Error();},chooseFolder:async()=>null,listFolder:async()=>{throw Error();},openFile:async()=>{throw Error();},
   storeChatFile:async input=>{if(input.data.byteLength!==3)throw Error('missing bytes');return {id:ids[input.name],name:input.name,kind:kinds[input.name],relativePath:input.name};},
   chatFile:async input=>{const name=Object.keys(ids).find(n=>ids[n]===input.id)!;return {entry:{id:input.id,name,relativePath:name,kind:'file',previewKind:kinds[name]},kind:kinds[name],bytes:3,...(kinds[name]==='text'?{text:'<script>window.executed=true</script>'}:{src:kinds[name]==='video'?'/demos/greeting.mp4':'/demos/storyboard/scene-1.jpg'})};}
  };
 });
 await page.goto('/desktop');
 await expect(page.getByText('ต้นแบบหน้าจอ · คำตอบและผลงานเป็นตัวอย่าง ยังไม่เรียกใช้ AI')).toHaveCount(0);
 await page.locator('input[type="file"]').setInputFiles(['photo.png','clip.mp4','scene.html'].map(name=>({name,mimeType:name.endsWith('.html')?'text/html':name.endsWith('.mp4')?'video/mp4':'image/png',buffer:Buffer.from('abc')})));
 await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 const log=page.getByRole('log');await expect(log.locator('video')).toHaveJSProperty('readyState',4);await expect(log.getByAltText('photo.png')).toBeVisible();
 await log.getByRole('button',{name:'เปิดไฟล์ scene.html'}).click();
 await expect(page.getByLabel('พรีวิว scene.html')).toContainText('<script>window.executed=true</script>');expect(await page.evaluate(()=>('executed' in window))).toBe(false);
 await page.getByRole('button',{name:'ซ่อนแผงไฟล์',exact:true}).click();await page.reload();await page.getByRole('button',{name:'เปิดแชต photo.png',exact:true}).click();
 await page.getByRole('button',{name:'ขยายภาพ photo.png'}).click();await expect(page.getByLabel('พรีวิว photo.png').getByAltText('photo.png')).toBeVisible();
 await page.screenshot({path:'.studio/frontend-review/chat-inline-media.png'});
});
