import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';import {findBrowser} from '../scripts/local/tools.mjs';
test('HTML creation publishes actual files; capture leaves the creative draft intact and emits bounded activity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-result-'));try{
 const skillRoot=await initializeSkills(root,resolve('skills')),events:{action:string;status:string}[]=[];
 const p=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot,sessionId:randomUUID(),toolPaths:{browser:findBrowser()!.path,ffmpeg:'unused',ffprobe:'unused'},onActivity:e=>events.push(e)});
 const draft={title:'Accepted',html:'<p>Accepted design</p>',width:320,height:320,durationSeconds:4,narration:'keep voice text'};
 const save=p.tools.find(t=>t.name==='save_html_animation')!;await save.execute('save',draft);
 assert.ok(p.resultFiles().some(f=>/design-\d+\.html$/.test(f.path)&&f.open));
 await writeFile(join(root,'other.html'),'<p>Different file</p>');await p.tools.find(t=>t.name==='capture_project_html')!.execute('capture',{path:'other.html',width:320,height:320});
 const current=await p.tools.find(t=>t.name==='read_current_animation')!.execute('read',{});assert.match(JSON.stringify(current),/keep voice text/);
 assert.ok(p.resultFiles().some(f=>f.path.endsWith('.png')));assert.equal(await readFile(join(root,'other.html'),'utf8'),'<p>Different file</p>');
 assert.ok(events.some((e)=>e.status==='completed'&&e.action==='write'));assert.ok(!JSON.stringify(events).includes('keep voice text'));
 await assert.rejects(p.tools.find(t=>t.name==='write_project_file')!.execute('bad',{path:'../escape.html',text:'secret'}));assert.ok(events.some((e)=>e.status==='failed'));
 }finally{await rm(root,{recursive:true,force:true});}
});
