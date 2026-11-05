import {test,expect} from '@playwright/test';
import {initialChatState} from '../../src/lib/chat-prototype';
test('older saved messages show one preview image and one final video player',async({page})=>{
 await page.addInitScript(seed=>{
  const image={id:'11111111-1111-4111-8111-111111111111',name:'preview.png',relativePath:'preview.png',kind:'image' as const};
  const video={id:'22222222-2222-4222-8222-222222222222',name:'video.mp4',relativePath:'video.mp4',kind:'video' as const};
  const artifact={id:'render',title:'Complete story',kind:'video' as const,src:'/demos/greeting.mp4',poster:'',files:[video]};
  localStorage.setItem('me-studio.chat-ui.v1',JSON.stringify({...seed,threads:[{id:'dedup-chat',title:'Saved result',draft:'',updatedAt:1,messages:[{id:'result',role:'assistant',text:'Complete',files:[image,image,video,{...video,id:'33333333-3333-4333-8333-333333333333',name:'earlier.mp4'}],artifacts:[artifact]}]}]}));
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,relinkProject:async()=>null,createProject:async()=>({id:'unused',name:'unused'}),chooseFolder:async()=>null,listFolder:async()=>{throw Error();},activateProject:async()=>{throw Error();},openFile:async()=>{throw Error();},chatFile:async({id})=>({kind:id===image.id?'image':'video',bytes:100,src:id===image.id?'/demos/storyboard/scene-1.jpg':'/demos/greeting.mp4',entry:{id,name:id===image.id?'preview.png':'video.mp4',relativePath:'',kind:'file',previewKind:id===image.id?'image':'video'}})} as typeof window.meStudioFiles;
 },initialChatState);
 await page.goto('/desktop');await page.getByRole('button',{name:'เปิดแชต Saved result',exact:true}).click();
 const log=page.getByRole('log');await expect(log.locator('img[alt="preview.png"]')).toHaveCount(1);await expect(log.locator('video')).toHaveCount(1);
 await expect(log.getByRole('button',{name:'เปิดไฟล์ video.mp4',exact:true})).toHaveCount(1);
 await log.locator('summary').filter({hasText:'วิดีโอเวอร์ชันก่อนหน้า'}).click();
 await expect(log.getByRole('button',{name:'เปิดไฟล์ earlier.mp4',exact:true})).toBeVisible();await expect(log.locator('video')).toHaveCount(1);
});
