import {test,expect,type Page} from '@playwright/test';
import {initialChatState} from '../../src/lib/chat-prototype';

async function setup(page:Page,mode:'changed'|'disconnected'|'failed'|'stale'){
 await page.addInitScript(({seed,mode})=>{
  localStorage.setItem('me-studio.chat-ui.v1',JSON.stringify({...seed,selectedProvider:'openai'}));
  let configured=false,calls=0;
  window.addEventListener('test-configure',()=>{configured=true;});
  const directory={id:'root',name:'videos',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
  window.meStudioFiles={projects:async()=>[{id:'11111111-1111-4111-8111-111111111111',name:'ช่องทดสอบ'}],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>({directory,entries:[],truncated:false}),chooseFolder:async()=>null,listFolder:async()=>({directory,entries:[],truncated:false}),openFile:async()=>{throw Error();},
   videoStatus:async()=>{
    calls++;
    if(mode==='failed')throw Error('synthetic-worker-offline');
    if(mode==='stale'&&calls===1)return new Promise(resolve=>window.addEventListener('test-stale-status',()=>resolve({configured:false,busy:false}),{once:true}));
    return {configured,busy:false};
   },
   loadVideoKeys:async()=>{configured=true;return {configured:true};},
   produceVideo:async input=>{sessionStorage.setItem('productionCalls',String(Number(sessionStorage.getItem('productionCalls')??0)+1));return {text:`Python ตอบจริงสำหรับ ${input.text}`};},
  };
 },{seed:initialChatState,mode});
 await page.goto('/desktop');
 await page.getByRole('button',{name:'แชตใหม่ใน ช่องทดสอบ',exact:true}).click();
}

test('send reads current worker configuration instead of returning a sample from cached disconnected state',async({page})=>{
 await setup(page,'changed');
 await page.evaluate(()=>window.dispatchEvent(new Event('test-configure')));
 await page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'}).fill('ทดสอบ Python');
 await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 await expect(page.getByRole('log')).toContainText('Python ตอบจริงสำหรับ ทดสอบ Python');
 await expect(page.getByRole('log')).not.toContainText('คำตอบตัวอย่าง');
 expect(await page.evaluate(()=>sessionStorage.getItem('productionCalls'))).toBe('1');
});
for(const mode of ['disconnected','failed'] as const)test(`native ${mode} keeps the draft and shows setup/error without a sample reply`,async({page})=>{
 await setup(page,mode);
 const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});await input.fill('อย่าทำข้อความนี้หาย');
 await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:mode==='disconnected'?'โหลดคีย์':'ตรวจสถานะ'})).toBeVisible();
 await expect(input).toHaveValue('อย่าทำข้อความนี้หาย');
 await expect(page.getByText('คำตอบตัวอย่าง',{exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem('productionCalls'))).toBeNull();
});
test('a stale startup status cannot undo successful key loading',async({page})=>{
 await setup(page,'stale');
 await page.getByRole('button',{name:'ตั้งค่า',exact:true}).click();
 await page.getByRole('tab',{name:'ผู้ให้บริการ AI',exact:true}).click();
 await page.getByRole('button',{name:'โหลดคีย์ AI / เสียง',exact:true}).click();
 await expect(page.getByRole('button',{name:'เปลี่ยนคีย์ AI / เสียง',exact:true})).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('test-stale-status')));
 await expect(page.getByRole('button',{name:'เปลี่ยนคีย์ AI / เสียง',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog').getByRole('status')).toContainText('โหลดคีย์แล้ว');
});
