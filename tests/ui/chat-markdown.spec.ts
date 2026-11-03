import {test,expect} from '@playwright/test';
import {initialChatState} from '../../src/lib/chat-prototype';
const answer=`## แนวที่แนะนำ: กลับมาหาคนสำคัญ

เริ่มจาก **จังหวะที่ลืม** แล้วค่อยเฉลยด้วยการกลับมาหา ใช้ภาพเล่าเรื่องแทนบทพูด

### จังหวะภาพ

| เวลา | ภาพ | เหตุผล |
| --- | --- | --- |
| 0–3 วินาที | ยืนรออยู่หน้าประตู | ให้คนดูเข้าใจความคาดหวัง |
| 3–9 วินาที | เดินออกไปแล้วนึกได้ | สร้างจังหวะหยุดก่อนกลับมา |
| 9–15 วินาที | กลับมาหอมแก้ม | คลี่คลายด้วยการกระทำ |

1. ใช้ภาพแนวตั้ง 9:16
2. เก็บสีและลักษณะจากภาพอ้างอิง

- ไม่มีบทพูด
- เสียงฝีเท้าและดนตรีเบา ๆ

> ความยาวนี้เป็นข้อเสนอ ปรับตามจังหวะที่คุณชอบได้

ตัวอย่างค่าที่ใช้: \`durationSeconds\`

\`\`\`json
{"durationSeconds":15,"layout":"portrait"}
\`\`\`

[เอกสารอ้างอิง](https://example.com/reference)

`;
const attack=`
<img src="https://external.invalid/tracker.png" onerror="window.markdownUnsafe=true"><script>window.markdownUnsafe=true</script>

[อันตราย](javascript:alert(1))
![ภาพภายนอก](https://external.invalid/another-tracker.png)
`;
test('native replies render semantic Markdown without losing source or loading untrusted content',async({page})=>{
 await page.addInitScript(({seed,answer,attack})=>{
  localStorage.setItem('me-studio.chat-ui.v1',JSON.stringify({...seed,selectedProvider:'openai'}));
  window.meStudioFiles={projects:async()=>[],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>{throw Error();},chooseFolder:async()=>null,listFolder:async()=>{throw Error();},openFile:async()=>{throw Error();},videoStatus:async()=>({configured:true,busy:false}),produceVideo:async input=>({text:input.text==='ตรวจความปลอดภัย'?attack:answer})};
 },{seed:initialChatState,answer,attack});
 const outbound:string[]=[];page.on('request',request=>{if(request.url().includes('external.invalid'))outbound.push(request.url());});
 await page.goto('/desktop');const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
 await input.fill('ช่วยวางจังหวะเรื่องจากไอเดียนี้');await input.press('Enter');
 const reply=page.getByRole('log').locator('.message-assistant .chat-markdown');
 await expect(reply.getByRole('heading',{name:'แนวที่แนะนำ: กลับมาหาคนสำคัญ'})).toBeVisible();
 await expect(reply.locator('strong')).toHaveText('จังหวะที่ลืม');
 await expect(reply.getByRole('table').getByRole('row')).toHaveCount(4);
 await expect(reply.locator('ol > li')).toHaveCount(2);await expect(reply.locator('ul > li')).toHaveCount(2);
 await expect(reply.locator('pre code')).toContainText('durationSeconds');
 await expect(reply.getByRole('link',{name:'เอกสารอ้างอิง'})).toHaveAttribute('href','https://example.com/reference');
 await expect(reply.locator('a[href^="javascript:"],script,img,iframe')).toHaveCount(0);
 expect(await page.evaluate(()=>Object.hasOwn(window,'markdownUnsafe'))).toBe(false);expect(outbound).toEqual([]);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('me-studio.chat-ui.v1')!).threads[0]?.messages.at(-1)?.text)).toBe(answer);
 await page.getByRole('log').evaluate(el=>{el.scrollTop=0;});
 for(const theme of ['light','dark'] as const){
  await page.evaluate(theme=>document.documentElement.dataset.studioTheme=theme,theme);
  await page.screenshot({path:`.studio/frontend-review/chat-markdown-${theme}.png`,animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'ยุบแถบด้านข้าง',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(await reply.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await expect(input).toBeVisible();
 await page.getByRole('log').evaluate(el=>{el.scrollTop=0;});
 await page.screenshot({path:'.studio/frontend-review/chat-markdown-mobile.png',animations:'disabled'});
 await input.fill('ตรวจความปลอดภัย');await input.press('Enter');
 const unsafe=page.getByRole('log').locator('.message-assistant .chat-markdown').last();
 await expect(unsafe).toContainText('อันตราย');
 await expect(unsafe.locator('a[href^="javascript:"],script,img,iframe')).toHaveCount(0);
 expect(await page.evaluate(()=>Object.hasOwn(window,'markdownUnsafe'))).toBe(false);expect(outbound).toEqual([]);
});
