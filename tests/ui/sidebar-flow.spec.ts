import { test, expect } from '@playwright/test';
import { initialChatState } from '../../src/lib/chat-prototype';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seed => {
    if (!localStorage.getItem('me-studio.chat-ui.v1')) localStorage.setItem('me-studio.chat-ui.v1', JSON.stringify(seed));
    const listing = { directory: { id: 'root', name: 'source', relativePath: '', kind: 'directory' as const, previewKind: 'unsupported' as const }, entries: [], truncated: false };
    window.meStudioFiles = {
      projects: async () => [{ id: 'a', name: 'ช่อง A' }, { id: 'b', name: 'ช่อง B' }, ...Array.from({ length: 24 }, (_, i) => ({ id: `extra-${i}`, name: `Project ${i}` }))],
      activateProject: async () => { sessionStorage.setItem('activations', String(Number(sessionStorage.getItem('activations') ?? 0) + 1)); return listing; },
      pickProjectFolder: async () => null, createProject: async () => ({ id: 'unused', name: 'unused' }), relinkProject: async () => null,
      chooseFolder: async () => listing, listFolder: async () => listing, openFile: async () => { throw Error('INVALID_FILE'); },
    };
  }, { ...initialChatState, drafts: [], threads: [{ id: 'sent-a', projectId: 'a', title: 'คลิปแรก', draft: '', updatedAt: 1, messages: [
    { id: 'm1', role: 'user', text: 'คลิปแรก' },
    { id: 'm2', role: 'assistant', text: 'ตัวอย่าง', sample: true, artifacts: [{ id: 'sample', title: 'วิดีโอตัวอย่าง', kind: 'video', src: '/demos/greeting.mp4', poster: '/demos/storyboard/scene-1.jpg' }] },
  ] }, {id:'default-old',title:'แชตทั่วไปเดิม',draft:'',updatedAt:2,messages:[{id:'default-m',role:'user',text:'ข้อความเดิมยังอยู่'}]},
  {id:'sent-b',projectId:'b',title:'คลิปสอง',draft:'',updatedAt:3,messages:Array.from({length:50},(_,i)=>({id:`b-${i}`,role:i%2?'assistant':'user',text:`ข้อความที่ ${i} ของคลิปสอง\nรายละเอียดบทสนทนาเพิ่มเติม`}))}] });
  await page.goto('/desktop');
});

test('project disclosure never creates a chat, activates a folder or disturbs the player', async ({ page }) => {
  const project = page.getByRole('button', { name: 'Project 0', exact: true });
  const group = page.locator('.project-group').filter({ has: project });
  await expect(group).toContainText('ไม่มีแชต');
  await expect(page.getByRole('button', { name: 'เปิดแชต แชตใหม่', exact: true })).toHaveCount(0);
  await project.click(); await expect(project).toHaveAttribute('aria-expanded', 'false');
  await project.click(); await expect(project).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => sessionStorage.getItem('activations'))).toBeNull();
  await page.getByRole('button', { name: 'เปิดแชต คลิปแรก', exact: true }).click();
  await page.getByRole('button', { name: 'ดูวิดีโอตัวอย่าง', exact: true }).click();
  const player = page.getByRole('region', { name: 'ดูผลงาน' }).locator('video');
  await expect(player).toHaveJSProperty('readyState', 4);
  const element = await player.elementHandle();
  await player.evaluate(el => { (el as HTMLVideoElement).currentTime = 2; });
  const activations = await page.evaluate(() => sessionStorage.getItem('activations'));
  await page.getByRole('button', { name: 'ช่อง A', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('คลิปแรก');
  await expect(player).toBeVisible();
  expect(await player.evaluate((el, original) => el === original, element)).toBe(true);
  expect(await player.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => sessionStorage.getItem('activations'))).toBe(activations);
  await page.getByRole('button',{name:'เปิดแชต คลิปสอง',exact:true}).click();
  expect(await player.evaluate((el,original)=>el===original,element)).toBe(true);
  expect(await player.evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThanOrEqual(2);
});

test('project drafts survive switching and reload; history only appears on first send', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'ข้อความถึงผู้ช่วย' });
  await page.getByRole('button', { name: 'แชตใหม่ใน ช่อง A', exact: true }).click();
  await input.fill('ร่างของ A');
  await page.getByRole('button', { name: 'แชตใหม่ใน ช่อง B', exact: true }).click();
  await input.fill('ร่างของ B');
  await expect(page.getByRole('button', { name: 'เปิดแชต ร่างของ B', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'แชตใหม่ใน ช่อง A', exact: true }).click();
  await expect(input).toHaveValue('ร่างของ A');
  await page.reload();
  await page.getByRole('button', { name: 'แชตใหม่ใน ช่อง B', exact: true }).click();
  await expect(input).toHaveValue('ร่างของ B');
  await page.getByRole('button', { name: 'ส่งข้อความ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เปิดแชต ร่างของ B', exact: true })).toHaveCount(1);
  // Persistence is debounced; inspect the final record after the write settles.
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('me-studio.chat-ui.v1')!).threads.filter((t: { projectId: string }) => t.projectId === 'b').length)).toBe(1);
});

test('compact hover keeps row geometry; sidebar and scroll position survive collapse', async ({ page }) => {
  const row = page.locator('.history-row').filter({ hasText: 'คลิปแรก' });
  const before = await row.boundingBox();
  await row.hover();
  const after = await row.boundingBox();
  expect(after?.height).toBe(34); expect(after).toEqual(before);
  const sidebar = await page.locator('.chat-sidebar').elementHandle();
  await page.locator('.chat-history').evaluate(el => { el.scrollTop = 280; });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('me-studio.chat-ui.v1')!).preferences.sidebarScrollTop)).toBe(280);
  await page.getByRole('button', { name: 'ยุบแถบด้านข้าง', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'แถบเครื่องมือแชต' })).toBeVisible();
  await page.getByRole('button', { name: 'เปิดแถบด้านข้าง', exact: true }).click();
  expect(await page.locator('.chat-sidebar').evaluate((el, original) => el === original, sidebar)).toBe(true);
  expect(await page.locator('.chat-history').evaluate(el => el.scrollTop)).toBe(280);
  await expect(page.locator('.chat-sidebar-slot')).toHaveCSS('width', '246px');
  await page.locator('.chat-history').evaluate(el=>{el.scrollTop=0;});
  await page.screenshot({ path: '.studio/frontend-review/sidebar-flow-light.png', animations: 'disabled' });
  await page.getByRole('button',{name:'ตั้งค่า',exact:true}).click();
  await page.getByRole('radio',{name:'มืด',exact:true}).check();
  await page.getByRole('button',{name:'ปิดการตั้งค่า',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.chat-home-brand strong')).toHaveCSS('color','rgb(225, 225, 227)');
  await page.screenshot({ path: '.studio/frontend-review/sidebar-flow-dark.png', animations: 'disabled' });
});

test('every chat is in a workspace; chat selection preserves folder disclosure and the fixed shell', async ({page})=>{
  const defaultProject=page.getByRole('button',{name:'Default workspace',exact:true});
  await expect(defaultProject).toBeVisible();
  await expect(page.locator('.project-group').filter({has:defaultProject})).toContainText('แชตทั่วไปเดิม');
  await expect(page.getByRole('heading',{name:'แชตล่าสุด',exact:true})).toHaveCount(0);
  const a=page.getByRole('button',{name:'ช่อง A',exact:true});
  const b=page.getByRole('button',{name:'ช่อง B',exact:true});
  await b.click();
  const sidebar=await page.locator('.chat-sidebar').elementHandle();
  const navigation=await page.getByRole('navigation',{name:'แถบนำทางหลัก'}).elementHandle();
  const transcript=await page.getByRole('log').elementHandle();
  const composer=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
  const before=await composer.boundingBox();
  await page.getByRole('button',{name:'เปิดแชต คลิปแรก',exact:true}).click();
  await expect(a).toHaveAttribute('aria-expanded','true');
  await expect(b).toHaveAttribute('aria-expanded','false');
  await expect(page.getByRole('log')).toContainText('คลิปแรก');
  expect(await composer.boundingBox()).toEqual(before);
  expect(await page.locator('.chat-sidebar').evaluate((el,original)=>el===original,sidebar)).toBe(true);
  expect(await page.getByRole('navigation',{name:'แถบนำทางหลัก'}).evaluate((el,original)=>el===original,navigation)).toBe(true);
  expect(await page.getByRole('log').evaluate((el,original)=>el===original,transcript)).toBe(true);
  await page.getByRole('button',{name:'แชตใหม่ใน Default workspace',exact:true}).click();
  await expect(a).toHaveAttribute('aria-expanded','true');
  await expect(b).toHaveAttribute('aria-expanded','false');
  expect(await composer.boundingBox()).toEqual(before);
  await composer.fill('แชตทั่วไป');
  await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
  const group=page.locator('.project-group').filter({has:defaultProject});
  await expect(group.getByRole('button',{name:'เปิดแชต แชตทั่วไป',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'เปิดแชต คลิปแรก',exact:true}).click();
  await expect(b).toHaveAttribute('aria-expanded','false');
  await expect(a).toHaveAttribute('aria-expanded','true');
});

test('rapid chat selection shows only the final chat, restores its scroll and respects reduced motion', async ({page})=>{
  const first=page.getByRole('button',{name:'เปิดแชต คลิปแรก',exact:true});
  const second=page.getByRole('button',{name:'เปิดแชต คลิปสอง',exact:true});
  await second.click();
  const log=page.getByRole('log');
  await expect(log).toContainText('ข้อความที่ 49');
  await log.evaluate(el=>{el.scrollTop=260;el.dispatchEvent(new Event('scroll'));});
  await first.click();
  await second.click();
  await first.click();
  await second.click();
  await expect(log).toContainText('ข้อความที่ 49');
  await expect(log).not.toContainText('คลิปแรก');
  await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBe(260);
  await expect(page.locator('.message-column')).toHaveCSS('animation-name','chat-thread-enter');
  await page.emulateMedia({reducedMotion:'reduce'});
  await first.click();
  await expect(page.locator('.message-column')).toHaveCSS('animation-name','none');
  await expect(log).toContainText('คลิปแรก');
});
