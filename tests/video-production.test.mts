import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,readFile,writeFile,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { sceneSchema,compileAnimation } from '../src/server/video/scene.mjs';
import { createProductionTools,initializeSkills,readSkills } from '../src/server/video/production.mjs';
const scene={title:'ทดสอบ </script><script>bad()</script>',durationSeconds:8,layout:'portrait',background:'city-night',characters:[{name:'บิว',shirt:'#112233'},{name:'แมค',shirt:'#334455'}],cues:[{start:.5,end:3,speaker:0,text:'สวัสดี',action:'wave'}],ending:'จบ'};
test('trusted compiler rejects invalid timing and keeps model strings as data',()=>{
 assert.equal(sceneSchema.safeParse({...scene,cues:[{...scene.cues[0],end:20}]}).success,false);
 const html=compileAnimation(scene);assert.ok(!html.includes('</script><script>bad()'));assert.ok(html.includes('window.seek=function'));assert.ok(html.includes('\\u003c/script>'));assert.equal(sceneSchema.safeParse({...scene,script:'evil'}).success,false);
});
test('project skills isolate overrides, refuse symlink escapes and preserve existing files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-skills-'));try{
 const a=join(root,'a'),b=join(root,'b');await mkdir(a);await mkdir(b);const skills=await initializeSkills(a,resolve('skills'));await writeFile(join(skills,'storyboard','SKILL.md'),'project A tone');await initializeSkills(a,resolve('skills'));const other=await initializeSkills(b,resolve('skills'));assert.equal((await readSkills(skills))[0].text,'project A tone');assert.notEqual((await readSkills(other))[0].text,'project A tone');
 const c=join(root,'c');await mkdir(c);await symlink(b,join(c,'.me-studio'));await assert.rejects(initializeSkills(c,resolve('skills')),/INVALID_SKILL/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('production writes new version, refuses voiced render without speech, preserves source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-production-'));try{
 await writeFile(join(root,'original.html'),'keep');const skillRoot=await initializeSkills(root,resolve('skills'));const p=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot});await p.save(scene);
 assert.equal(await readFile(join(root,'original.html'),'utf8'),'keep');await assert.rejects(p.render(true),/VOICE_NOT_READY/);await assert.rejects(p.voice(),/VOICE_KEY_REQUIRED/);assert.ok((await readFile(join(p.directory,'storyboard.md'),'utf8')).includes('สวัสดี'));const p2=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot});assert.notEqual(p.directory,p2.directory);
 }finally{await rm(root,{recursive:true,force:true});}
});
