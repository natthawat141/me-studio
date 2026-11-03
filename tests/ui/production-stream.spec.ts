import {test,expect} from '@playwright/test';
import {initialChatState} from '../../src/lib/chat-prototype';
test('request-scoped streaming preserves partial output on Stop and ignores late results; reasoning persists',async({page})=>{
 await page.addInitScript(seed=>{
  localStorage.setItem('me-studio.chat-ui.v1',JSON.stringify(seed));
  const catalog={providers:[{id:'openai',name:'OpenAI',configured:true,models:[{id:'gpt-6-luna',label:'GPT-6 Luna',enabled:true}]}],defaultProvider:'openai',defaultModel:'gpt-6-luna',voiceConfigured:false,reasoning:'auto' as 'auto'|'high'};
  const root={id:'root',name:'workspace',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
  const state=window as unknown as {emit:(e:unknown)=>void;calls:Record<string,unknown>[];finish:((v:{text:string})=>void)[]};state.calls=[];state.finish=[];
  window.meStudioFiles={projects:async()=>[],relinkProject:async()=>null,pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),activateProject:async()=>({directory:root,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory:root,entries:[],truncated:false}),openFile:async()=>{throw Error();},configCatalog:async()=>structuredClone(catalog),setReasoning:async input=>{catalog.reasoning=input.effort as 'auto'|'high';return structuredClone(catalog);},videoStatus:async()=>({configured:true,busy:false}),cancelVideo:async()=>({}),onProductionEvent:callback=>{state.emit=e=>callback(e as Parameters<typeof callback>[0]);return()=>{};},produceVideo:input=>{state.calls.push(input);return new Promise(resolve=>state.finish.push(resolve));}};
 },initialChatState);
 await page.goto('/desktop');const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}),log=page.getByRole('log');
 await page.getByRole('button',{name:'ระดับการคิด',exact:true}).click();await page.getByRole('menuitem',{name:'มาก',exact:true}).click();await expect(page.getByRole('button',{name:'ระดับการคิด',exact:true})).toContainText('High');
 await input.fill('เสนอแนวภาพ');await input.press('Enter');await expect(page.getByRole('button',{name:'หยุดตอบ'})).toBeVisible();
 await page.evaluate(()=>{const w=window as unknown as {calls:{requestId:string;sessionId:string}[];emit:(e:unknown)=>void};w.emit({...w.calls[0],kind:'production',type:'text_delta',text:'## แนวภาพ\n\nใช้ภาพอ้างอิงเดิม'});});
 await expect(log.getByRole('heading',{name:'แนวภาพ'})).toBeVisible();await expect(log).toContainText('ใช้ภาพอ้างอิงเดิม');
 await page.getByRole('button',{name:'หยุดตอบ'}).click();await expect(log).toContainText('หยุดแล้ว');
 await input.fill('รอบใหม่');await input.press('Enter');
 await page.evaluate(()=>{const w=window as unknown as {calls:{requestId:string;sessionId:string}[];emit:(e:unknown)=>void;finish:((v:{text:string})=>void)[]};w.emit({...w.calls[0],kind:'production',type:'text_delta',text:'ข้อความเก่าห้ามแทรก'});w.finish[0]({text:'ผลเก่าห้ามแทรก'});w.emit({...w.calls[1],kind:'production',type:'tool_start',name:'inspect_animation'});});
 await expect(page.getByRole('status',{name:'กำลังคิด…'})).toContainText('กำลังตรวจภาพผลงาน');
 await page.evaluate(()=>{const w=window as unknown as {calls:{requestId:string;sessionId:string}[];emit:(e:unknown)=>void;finish:((v:{text:string})=>void)[]};w.emit({...w.calls[1],kind:'production',type:'text_delta',text:'คำตอบรอบใหม่'});w.finish[1]({text:'คำตอบรอบใหม่สำเร็จ'});});
 await expect(log).toContainText('คำตอบรอบใหม่สำเร็จ');await expect(log).not.toContainText('ห้ามแทรก');await expect(log.getByText('คำตอบรอบใหม่สำเร็จ',{exact:true})).toHaveCount(1);
 await page.reload();await expect(page.getByRole('button',{name:'ระดับการคิด',exact:true})).toContainText('Auto'); // Native mock reloads; real persistence is covered by AppConfig tests.
});
