import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';
import {checkTools,runTool,toolEnvironment} from '../scripts/local/tools.mjs';
test('127-second multi-scene draft renders as one continuous MP4 and survives reopening', {timeout:600000},async t=>{
 const tools=await checkTools();if(!tools.ready){t.skip('Local browser and FFmpeg required');return;}
 const root=await mkdtemp(join(tmpdir(),'studio-long-'));
 try{
 const skillRoot=await initializeSkills(root,resolve('skills'));
 const options={source:root,outputRoot:join(root,'output'),skillRoot,sessionId:randomUUID(),toolPaths:{browser:tools.browser!.path,ffmpeg:tools.ffmpeg,ffprobe:tools.ffprobe}};
 const p=await createProductionTools(options);
 const draft={title:'Complete three-scene story',html:'<style>body{margin:0;background:red;animation:story 127s steps(1,end) both}@keyframes story{0%{background:red}34%{background:lime}67%,100%{background:blue}}</style><main></main>',width:320,height:320,durationSeconds:127,narration:''};
 await assert.rejects(p.saveHtml({...draft,durationSeconds:301}));
 await p.saveHtml(draft);
 const reopened=await createProductionTools(options);
 const current=await reopened.tools.find(x=>x.name==='read_current_animation')!.execute('read',{});
 assert.match(JSON.stringify(current),/127/);
 const artifact=await reopened.render(false);
 const probe=await runTool(tools.ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',String(artifact.path)]);
 assert.ok(Math.abs(Number(JSON.parse(probe.stdout).format.duration)-127)<0.2);
 for(const [seconds,expected] of [[0,0],[63,1],[126,2]]){
 const pixel=execFileSync(tools.ffmpeg,['-v','error','-ss',String(seconds),'-i',String(artifact.path),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],{env:{...toolEnvironment(),NODE_ENV:'test'},maxBuffer:1024});
 assert.ok(pixel[expected]>230&&[0,1,2].filter(c=>c!==expected).every(c=>pixel[c]<25),`scene at ${seconds}s should have channel ${expected}: ${[...pixel]}`);
 }
 const manifest=JSON.parse(await readFile(join(reopened.directory,'project.json'),'utf8'));assert.equal(manifest.durationSeconds,127);
 assert.equal(reopened.resultFiles().filter(x=>x.path.endsWith('video.mp4')).length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
