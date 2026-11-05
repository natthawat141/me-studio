import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {copyFileExclusive,copyToExportDirectory} from '../src/server/video/file-export.mjs';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';
import {createGeneratedFiles} from '../src/server/video/generated-files.mjs';

test('exports exact bytes, preserves originals and never overwrites or follows replaced paths',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-export-')));
 try{
  const source=join(root,'video.mp4'),downloads=join(root,'Downloads');await mkdir(downloads);await writeFile(source,'original video bytes');
  const first=await copyToExportDirectory(source,downloads),second=await copyToExportDirectory(source,downloads);
  assert.equal(first,join(downloads,'video.mp4'));assert.equal(second,join(downloads,'video (2).mp4'));
  assert.equal(await readFile(first,'utf8'),'original video bytes');assert.equal(await readFile(source,'utf8'),'original video bytes');
  await assert.rejects(copyFileExclusive(source,first),{code:'EEXIST'});
  await assert.rejects(copyToExportDirectory(source,downloads,'../escape.mp4'),/EXPORT_PATH_DENIED/);
  await assert.rejects(copyToExportDirectory(source,downloads,'.env'),/EXPORT_PATH_DENIED/);
  await symlink(source,join(downloads,'linked.mp4'));
  const safe=await copyToExportDirectory(source,downloads,'linked.mp4');assert.equal(safe,join(downloads,'linked (2).mp4'));
  await assert.rejects(copyFileExclusive(join(downloads,'linked.mp4'),join(downloads,'unsafe.mp4')),/FILE_OUTSIDE_FOLDER/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('agent exports only a real generated ID from this conversation to the host Downloads grant',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-agent-export-')));
 try{
  const source=join(root,'source'),downloads=join(root,'Downloads'),state=join(root,'state');await mkdir(source);await mkdir(downloads);await mkdir(state);
  const outputRoot=join(source,'output');await mkdir(outputRoot);const file=join(outputRoot,'final.mp4');await writeFile(file,'real bytes');
  const sessionId=randomUUID(),skillRoot=await initializeSkills(source,join(process.cwd(),'skills'));
  const generated=await createGeneratedFiles({stateRoot:state,sessionId,roots:[source,outputRoot]});const ref=await generated.remember(file,outputRoot);
  const options={source,outputRoot,skillRoot,stateRoot:state,sessionId,exportDirectory:downloads};
  const p=await createProductionTools(options),tool=p.tools.find(t=>t.name==='save_file_to_downloads')!;assert.ok(tool);
  await assert.rejects(tool.execute('forged',{id:randomUUID()}),/ARTIFACT_NOT_FOUND/);
  await assert.rejects(tool.execute('traversal',{id:ref.id,name:'../bad.mp4'}),/EXPORT_PATH_DENIED/);
  const result=await tool.execute('save',{id:ref.id,name:'My film.mp4'}),message=result.content.find(c=>c.type==='text');assert.ok(message?.type==='text');assert.equal(JSON.parse(message.text).saved,true);
  assert.equal(await readFile(join(downloads,'My film.mp4'),'utf8'),'real bytes');assert.equal(p.resultFiles().length,0);
  const listed=await p.tools.find(t=>t.name==='list_generated_files')!.execute('listed',{});assert.match(JSON.stringify(listed),/My film.mp4/);
  const isolated=await createProductionTools({...options,sessionId:randomUUID()});await assert.rejects(isolated.tools.find(t=>t.name===tool.name)!.execute('other',{id:ref.id}),/ARTIFACT_NOT_FOUND/);
  const noGrant=await createProductionTools({...options,exportDirectory:undefined});assert.equal(noGrant.tools.some(t=>t.name===tool.name),false);
 }finally{await rm(root,{recursive:true,force:true});}
});
