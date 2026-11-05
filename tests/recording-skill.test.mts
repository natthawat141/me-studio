import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createProductionTools,initializeSkills,readSkills} from '../src/server/video/production.mjs';

test('existing projects receive the recording guide without replacing their custom skills',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-recording-skill-')));
 try{
  const directory=join(root,'.me-studio','skills');
  for(const name of ['storyboard','html-animation','voice-edit','video-render']){
   await mkdir(join(directory,name),{recursive:true});
   await writeFile(join(directory,name,'SKILL.md'),`Custom ${name}`);
  }
  await initializeSkills(root,resolve('skills'));
  assert.ok((await readSkills(directory)).some(s=>s.name==='screen-recording'));
  assert.equal(await readFile(join(directory,'storyboard','SKILL.md'),'utf8'),'Custom storyboard');
  await writeFile(join(directory,'screen-recording','SKILL.md'),'Project recording instructions');
  await initializeSkills(root,resolve('skills'));
  assert.equal(await readFile(join(directory,'screen-recording','SKILL.md'),'utf8'),'Project recording instructions');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('recording guide is discoverable and can be disabled per project without granting capture tools',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-recording-pref-')));
 try{
  const skillRoot=await initializeSkills(root,resolve('skills'));
  const production=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot});
  const read=production.tools.find(t=>t.name==='read_video_skills')!;
  const toggle=production.tools.find(t=>t.name==='set_video_skill')!;
  const entries=async()=>{
   const result=await read.execute('read',{});
   const block=result.content.find(c=>c.type==='text')!;
   assert.equal(block.type,'text');
   return JSON.parse(block.text) as {name:string;enabled:boolean;text:string}[];
  };
  assert.equal((await entries()).find(s=>s.name==='screen-recording')?.enabled,true);
  await toggle.execute('disable',{name:'screen-recording',enabled:false});
  assert.deepEqual((await entries()).find(s=>s.name==='screen-recording'),{name:'screen-recording',enabled:false,text:''});
  await toggle.execute('enable',{name:'screen-recording',enabled:true});
  assert.ok((await entries()).find(s=>s.name==='screen-recording')?.text.length);
  assert.ok(!production.tools.some(t=>['record_screen','execute','shell','run_command'].includes(t.name)));
  await assert.rejects(toggle.execute('unknown',{name:'shell',enabled:true}));
 }finally{await rm(root,{recursive:true,force:true});}
});
