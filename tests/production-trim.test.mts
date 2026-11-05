import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGeneratedFiles} from '../src/server/video/generated-files.mjs';
import {createProductionTools} from '../src/server/video/production.mjs';
import {checkTools,runTool} from '../scripts/local/tools.mjs';

test('a later chat request can trim a published film with its audio and preserve the original',{timeout:30000},async t=>{
 const tools=await checkTools();if(!tools.ffmpeg||!tools.ffprobe){t.skip('FFmpeg required');return;}
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-trim-')));
 try{
  const source=join(root,'source'),state=join(root,'state'),outputRoot=join(source,'output');
  await mkdir(outputRoot,{recursive:true});await mkdir(state);
  const path=join(outputRoot,'full.mp4');
  await runTool(tools.ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x320:rate=24:duration=3','-f','lavfi','-i','sine=frequency=440:duration=3','-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-shortest',path]);
  const original=await readFile(path),sessionId=randomUUID();
  const registry=await createGeneratedFiles({stateRoot:state,sessionId,roots:[source,outputRoot]});
  const film=await registry.remember(path,outputRoot,'Original film');
  const options={source,outputRoot,stateRoot:state,skillRoot:state,sessionId,toolPaths:{browser:tools.browser?.path??'',ffmpeg:tools.ffmpeg,ffprobe:tools.ffprobe}};
  const reopened=await createProductionTools(options);
  const trim=reopened.tools.find(x=>x.name==='trim_video')!;
  await trim.execute('next-turn',{start:0,end:1.5});
  const cut=reopened.artifact()!;
  assert.notEqual(cut.path,path);assert.equal(cut.hasVoice,true);assert.equal(cut.durationSeconds,1.5);
  const probe=JSON.parse((await runTool(tools.ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',String(cut.path)])).stdout);
  assert.ok(Math.abs(Number(probe.format.duration)-1.5)<.1);assert.ok(probe.streams.some((s:{codec_type:string})=>s.codec_type==='audio'));
  assert.deepEqual(await readFile(path),original);
  const again=await createProductionTools(options),againTrim=again.tools.find(x=>x.name==='trim_video')!;
  await againTrim.execute('exact-original',{id:film.id,start:1,end:3});
  assert.equal(again.artifact()!.durationSeconds,2);
  await assert.rejects(againTrim.execute('outside',{id:film.id,start:0,end:4}),/INVALID_TRIM/);
  await assert.rejects(againTrim.execute('unknown',{id:randomUUID(),start:0,end:1}),/ARTIFACT_NOT_FOUND/);
  const listed=await createGeneratedFiles({stateRoot:state,sessionId,roots:[source,outputRoot]});
  assert.equal((await listed.list('video')).length,3);
 }finally{await rm(root,{recursive:true,force:true});}
});
