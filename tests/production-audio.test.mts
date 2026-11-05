import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir,symlink,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAudioAssets} from '../src/server/video/audio-assets.mjs';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';
import {checkTools,runTool} from '../scripts/local/tools.mjs';
test('attached MP3 becomes a scoped durable soundtrack and renders audible AAC after reopening',{timeout:120000},async t=>{
 const tools=await checkTools();if(!tools.ready){t.skip('Browser/FFmpeg required');return;}
 const root=await realpath(await mkdtemp(join(tmpdir(),'studio-audio-')));
 try{
 const source=join(root,'source'),state=join(root,'state');await mkdir(source);await mkdir(state);
 const path=join(root,'narration.mp3');await runTool(tools.ffmpeg,['-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-c:a','libmp3lame',path]);
 const original=await readFile(path),id=randomUUID();
 const registry=await createAudioAssets({stateRoot:state,ffmpeg:tools.ffmpeg,ffprobe:tools.ffprobe,references:[{id,name:'narration.mp3',path,root}]});
 const listed=registry.list();assert.equal(listed.length,1);assert.ok(Math.abs(listed[0].durationSeconds-2)<0.1);assert.ok(!JSON.stringify(listed).includes(root));
 await assert.rejects(registry.resolve(randomUUID()),/AUDIO_NOT_FOUND/);
 const link=join(root,'linked.mp3');await symlink(path,link);
 await assert.rejects(createAudioAssets({stateRoot:state,ffmpeg:tools.ffmpeg,ffprobe:tools.ffprobe,references:[{id:randomUUID(),name:'linked.mp3',path:link,root}]}),/AUDIO_PATH_DENIED/);
 const skillRoot=await initializeSkills(source,resolve('skills'));const options={source,outputRoot:join(source,'output'),stateRoot:state,skillRoot,sessionId:randomUUID(),toolPaths:{browser:tools.browser!.path,ffmpeg:tools.ffmpeg,ffprobe:tools.ffprobe}};
 const p=await createProductionTools(options);await p.saveHtml({title:'Audio test',html:'<p>One video with supplied audio</p>',width:320,height:320,durationSeconds:3,narration:''});
 await assert.rejects(p.tools.find(x=>x.name==='set_audio_track')!.execute('too-long',{id,startSeconds:2}),/AUDIO_EXCEEDS_TIMELINE/);
 const selected=await p.tools.find(x=>x.name==='set_audio_track')!.execute('select',{id,startSeconds:0,volume:1});assert.match(JSON.stringify(selected),/selected/);
 assert.match(JSON.stringify(await p.tools.find(x=>x.name==='synthesize_voice')!.execute('voice',{})),/VOICE_EXISTING_AUDIO_SELECTED/);
 const reopened=await createProductionTools(options);const result=await reopened.render(true);assert.equal(result.hasVoice,true);
 const probe=await runTool(tools.ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type,codec_name','-of','json',String(result.path)]);assert.ok(JSON.parse(probe.stdout).streams.some((s:{codec_name:string})=>s.codec_name==='aac'));
 const stats=await runTool(tools.ffmpeg,['-v','info','-i',String(result.path),'-af','volumedetect','-vn','-f','null','-']);assert.match(stats.stderr,/mean_volume: -(?:[1-4]?\d)(?:\.\d+)? dB/);
 assert.deepEqual(await readFile(path),original);
 await reopened.tools.find(x=>x.name==='set_audio_track')!.execute('clear',{id:null});
 const clear=await createProductionTools(options);await assert.rejects(clear.render(true),/VOICE_NOT_READY/);
 }finally{await rm(root,{recursive:true,force:true});}
});
