import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';import {findBrowser} from '../scripts/local/tools.mjs';
test('HTML creation publishes actual files; capture leaves the creative draft intact and emits bounded activity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-result-'));try{
 const skillRoot=await initializeSkills(root,resolve('skills')),events:{action:string;status:string}[]=[];
 const sessionId=randomUUID();const options={source:root,outputRoot:join(root,'output'),skillRoot,sessionId,toolPaths:{browser:findBrowser()!.path,ffmpeg:resolve('node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg'),ffprobe:resolve('node_modules/@ffprobe-installer/darwin-arm64/ffprobe')},onActivity:(e:{action:string;status:string})=>events.push(e)};
 const p=await createProductionTools(options);
 // Publishing must preserve the existing workspace file contracts.
 for(const extension of ['csv','yaml','yml']){
  const path='captions.'+extension,text='time,text\n0,Hello';
  await p.tools.find(t=>t.name==='write_project_file')!.execute('write-'+extension,{path,text});
  assert.equal(await readFile(join(root,path),'utf8'),text);
 }
 for(const extension of ['gif','avif']){
  const path='reference.'+extension;await writeFile(join(root,path),'image fixture');
  await p.tools.find(t=>t.name==='open_project_file')!.execute('open-'+extension,{path});
  assert.ok(p.resultFiles().some(f=>f.path.endsWith(path)&&f.open));
 }
 const draft={title:'Accepted',html:'<p>Accepted design</p>',width:320,height:320,durationSeconds:4,narration:'keep voice text'};
 const save=p.tools.find(t=>t.name==='save_html_animation')!;const saved=await save.execute('save',draft);assert.equal(saved.content.filter(p=>p.type==='image').length,3);assert.match(JSON.stringify(saved.content[0]),/inspectionIncluded/);
 assert.ok(p.resultFiles().some(f=>/design-\d+\.html$/.test(f.path)&&f.open));
 await writeFile(join(root,'other.html'),'<p>Different file</p>');await p.tools.find(t=>t.name==='capture_project_html')!.execute('capture',{path:'other.html',width:320,height:320});
 const current=await p.tools.find(t=>t.name==='read_current_animation')!.execute('read',{});assert.match(JSON.stringify(current),/keep voice text/);
 assert.ok(p.resultFiles().some(f=>f.path.endsWith('.png')));assert.equal(await readFile(join(root,'other.html'),'utf8'),'<p>Different file</p>');
 assert.ok(events.some((e)=>e.status==='completed'&&e.action==='write'));
 assert.ok(JSON.stringify(events).includes('design-1.html'));assert.ok(!JSON.stringify(events).includes('keep voice text'));
 const restarted=await createProductionTools(options);const catalog=await restarted.tools.find(t=>t.name==='list_generated_files')!.execute('list',{kind:'image'});const listed=JSON.parse((catalog.content[0] as {text:string}).text).files;assert.ok(listed.length>=2);const captured=listed.find((f:{title:string})=>f.title.includes('other.html'));assert.ok(captured);
 await restarted.tools.find(t=>t.name==='open_generated_file')!.execute('reopen',{id:captured.id});assert.ok(restarted.resultFiles().some(f=>f.path.endsWith('.png')&&f.open));
 await assert.rejects(p.tools.find(t=>t.name==='write_project_file')!.execute('bad',{path:'../escape.html',text:'secret'}));assert.ok(events.some((e)=>e.status==='failed'));
 }finally{await rm(root,{recursive:true,force:true});}
});
