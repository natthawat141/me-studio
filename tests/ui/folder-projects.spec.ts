import { test, expect } from '@playwright/test';

test('project groups chats and restores them after reload, with missing-folder relink', async ({ page }) => {
  await page.addInitScript(() => {
    const root = {id:'root',name:'videos',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
    const listing = {directory:root,entries:[],truncated:false};
    window.meStudioFiles = {
      beginProjectEdit:async()=>({token:'edit',name:'',nameOrigin:'folder',sourcePath:'',outputPath:'',folderName:''}),
      pickProjectDirectory:async()=>({token:'edit',name:'videos',nameOrigin:'folder',sourcePath:'/videos',outputPath:'/videos/output',folderName:'videos'}),
      saveProjectEdit:async({name})=>{const p={id:'project-1',name};sessionStorage.setItem('test-projects',JSON.stringify([p]));return p;},cancelProjectEdit:async()=>({}),
      projects: async () => JSON.parse(sessionStorage.getItem('test-projects') ?? '[]'),
      pickProjectFolder: async () => ({id:'selection-1',name:'videos'}),
      createProject: async ({name}) => { const p={id:'project-1',name};sessionStorage.setItem('test-projects',JSON.stringify([p]));return p; },
      activateProject: async () => {if(sessionStorage.getItem('missing')) throw new Error('FILE_READ_FAILED');return listing;},
      relinkProject: async () => {sessionStorage.removeItem('missing');return {id:'project-1',name:'ช่องของฉัน'};},
      chooseFolder: async () => listing, listFolder: async () => listing,
      openFile: async () => {throw new Error('INVALID_FILE');},
    };
  });
  await page.goto('/desktop');
  await page.getByRole('button',{name:'สร้าง Project'}).click();
  await page.getByLabel('ชื่อโปรเจกต์').fill('ช่องของฉัน');
  await expect(page.getByRole('dialog').getByRole('button',{name:'สร้างโปรเจกต์'})).toBeDisabled();
  await page.getByRole('dialog').getByRole('button',{name:'เลือกโฟลเดอร์ต้นทาง'}).click();
  await expect(page.getByRole('dialog')).toContainText('videos');
  await page.getByRole('dialog').getByRole('button',{name:'สร้างโปรเจกต์'}).click();
  await expect(page.getByRole('button',{name:'ช่องของฉัน',exact:true})).toBeVisible();
  const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
  await input.fill('คลิปแรก');
  await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
  await expect(page.getByRole('log')).toContainText('คลิปแรก');
  await page.reload();
  await page.evaluate(() => sessionStorage.setItem('missing','1'));
  await page.getByRole('button',{name:'เปิดแชต คลิปแรก',exact:true}).click();
  await expect(page.getByRole('log')).toContainText('คลิปแรก');
  await expect(page.getByRole('alert').filter({hasText:'อาจถูกย้าย'})).toBeVisible();
  await page.getByRole('button',{name:'เลือกโฟลเดอร์ใหม่'}).click();
  await expect(page.getByRole('alert').filter({hasText:'อาจถูกย้าย'})).toHaveCount(0);
});

test('project chat actions keep conversations scoped and deletion is confirmed', async ({page}) => {
  await page.addInitScript(() => {
    const root={id:'root',name:'videos',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
    const listing={directory:root,entries:[],truncated:false};
    window.meStudioFiles={projects:async()=>[{id:'a',name:'ช่อง A',folderName:'videos'},{id:'b',name:'ช่อง B',folderName:'other'}],pickProjectFolder:async()=>null,createProject:async()=>({id:'x',name:'x'}),relinkProject:async()=>null,activateProject:async()=>listing,chooseFolder:async()=>listing,listFolder:async()=>listing,openFile:async()=>{throw Error('INVALID_FILE');}};
  });
  await page.goto('/desktop');
  await page.getByRole('button',{name:'ช่อง A',exact:true}).hover();
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText('videos');
  await page.getByRole('button',{name:'แชตใหม่ใน ช่อง A'}).click();
  const input=page.getByRole('textbox',{name:'ข้อความถึงผู้ช่วย'});
  await input.fill('เรื่องของ A');
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องของ A'})).toHaveCount(0);
  await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
  await expect(page.getByRole('button',{name:'ส่งข้อความ',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'แชตใหม่ใน ช่อง B'}).click();
  await input.fill('เรื่องของ B');
  await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
  await expect(page.getByRole('button',{name:'ส่งข้อความ',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'แชตใหม่',exact:true}).click();
  await input.fill('เรื่องที่สองของ B');
  await page.getByRole('button',{name:'ส่งข้อความ',exact:true}).click();
  await expect(page.getByRole('button',{name:'ส่งข้อความ',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องของ A'})).toBeVisible();
  await page.getByRole('button',{name:'เมนูแชต เรื่องของ B'}).click();
  await page.getByRole('menuitem',{name:'ลบแชต'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'ยกเลิก'}).click();
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องของ B'})).toBeVisible();
  await page.getByRole('button',{name:'เมนูแชต เรื่องของ B'}).click();
  await page.getByRole('menuitem',{name:'ลบแชต'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'ลบแชต'}).click();
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องของ B',exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องของ A'})).toBeVisible();
  await expect(page.getByRole('button',{name:'เปิดแชต เรื่องที่สองของ B'})).toBeVisible();
});

test('project settings select source and output folders without moving chats', async ({page}) => {
  await page.addInitScript(() => {
    let project={id:'a',name:'ช่อง A',folderName:'source',sourcePath:'/videos/source',outputPath:'/videos/source/output'};
    const root={id:'root',name:'source',relativePath:'',kind:'directory' as const,previewKind:'unsupported' as const};
    const listing={directory:root,entries:[],truncated:false};
    window.meStudioFiles={beginProjectEdit:async()=>({token:'edit',...project,nameOrigin:'custom',sourcePath:project.sourcePath,outputPath:project.outputPath}),pickProjectDirectory:async({kind})=>({token:'edit',...project,nameOrigin:'custom',folderName:'new-source',sourcePath:'/videos/new-source',outputPath:kind==='output'?'/exports':project.outputPath}),saveProjectEdit:async({name})=>{project={...project,name,sourcePath:'/videos/new-source',outputPath:'/exports'};return project;},cancelProjectEdit:async()=>({}),projects:async()=>[project],pickProjectFolder:async()=>null,createProject:async()=>project,activateProject:async()=>listing,relinkProject:async()=>{project={...project,folderName:'new-source',sourcePath:'/videos/new-source'};return project;},setProjectOutput:async()=>{project={...project,outputPath:'/exports'};return project;},chooseFolder:async()=>listing,listFolder:async()=>listing,openFile:async()=>{throw Error('INVALID_FILE');}};
  });
  await page.goto('/desktop');
  await page.getByRole('button',{name:'รายละเอียด ช่อง A'}).click();
  await page.getByRole('menuitem',{name:'ตั้งค่า Project'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('/videos/source');
  await dialog.getByRole('button',{name:'เลือกโฟลเดอร์ต้นทาง'}).click();
  await expect(dialog).toContainText('/videos/new-source');
  await dialog.getByRole('button',{name:'เลือกโฟลเดอร์ผลงาน'}).click();
  await expect(dialog).toContainText('/exports');
  await dialog.getByRole('button',{name:'บันทึก',exact:true}).click();
  await expect(dialog).toHaveCount(0);
});
