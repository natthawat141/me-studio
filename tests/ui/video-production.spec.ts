import {test,expect} from '@playwright/test';
test('native video chat returns a real artifact, preserves project and reload resolves a fresh media grant',async({page})=>{
 await page.addInitScript(()=>{
  const directory={id:'root',name:'videos',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
  window.meStudioFiles={projects:async()=>[{id:'11111111-1111-4111-8111-111111111111',name:'ช่องทดสอบ'}],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>({directory,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory,entries:[],truncated:false}),openFile:async()=>{throw Error();},videoStatus:async()=>({configured:true,busy:false}),produceVideo:async()=>({text:'สร้างเสร็จแล้ว',artifact:{id:'22222222-2222-4222-8222-222222222222',title:'การ์ตูนของฉัน',url:'studio-media://33333333-3333-4333-8333-333333333333/video.mp4',hasVoice:true}}),videoArtifact:async()=>({id:'22222222-2222-4222-8222-222222222222',title:'การ์ตูนของฉัน',url:'studio-media://44444444-4444-4444-8444-444444444444/video.mp4'})};
 });
 await page.goto('/desktop');await page.getByRole('button',{name:'ช่องทดสอบ',exact:true}).click();
 // Choose the fixed live provider rather than silently routing a different provider.
 await page.getByRole('button',{name:'เลือกโมเดล'}).click();await page.getByRole('menuitem').filter({hasText:'OpenAI'}).click();
 await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).fill('สร้างการ์ตูนสั้น');await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('สร้างเสร็จแล้ว');await page.reload();await page.getByRole('button',{name:'เปิดแชต สร้างการ์ตูนสั้น'}).click();await page.getByRole('button',{name:'ดูการ์ตูนของฉัน'}).click();
 await expect(page.locator('video')).toHaveAttribute('src','studio-media://44444444-4444-4444-8444-444444444444/video.mp4');
});
