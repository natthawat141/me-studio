import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createProductionTools,initializeSkills} from '../src/server/video/production.mjs';
import {findBrowser,runTool} from '../scripts/local/tools.mjs';
test('real image assets survive draft inspection, MP4 inspection and bounded versioned revisions',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-creative-assets-'));
 try{
 const ffmpeg=resolve('node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg'),ffprobe=resolve('node_modules/@ffprobe-installer/darwin-arm64/ffprobe'),browser=findBrowser()!.path;
 const skillRoot=await initializeSkills(root,resolve('skills'));const image=join(root,'reference.png');
 await runTool(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=red:s=32x32','-frames:v','1','-y',image]);
 const p=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot,toolPaths:{ffmpeg,ffprobe,browser},references:[{name:'reference.png',dataUrl:'data:image/png;base64,'+(await readFile(image)).toString('base64')}]});
 const draft={title:'Image test',width:320,height:320,durationSeconds:1,narration:'',html:`<style>img{width:320px;height:320px}</style><img src="${p.assets()[0].src}">`};
 await assert.rejects(p.saveHtml({...draft,html:'<img src="assets/invented.png">'}),/HTML_EXTERNAL_RESOURCE/);
 await assert.rejects(p.saveHtml({...draft,html:'<img src="https://example.org/x.png">'}),/HTML_EXTERNAL_RESOURCE/);
 await p.saveHtml(draft);const inspected=await p.inspect();assert.equal(inspected.content.filter(p=>p.type==='image').length,3);assert.match(inspected.content[0].type==='text'?inspected.content[0].text:'',/draft/);
 const paths=[];for(let i=0;i<3;i++){if(i)await p.saveHtml({...draft,title:'Revision '+i});const artifact=await p.render(false);paths.push(String(artifact.path));await readFile(String(artifact.path));}
 const pixel=join(root,'pixel.rgb');await runTool(ffmpeg,['-hide_banner','-loglevel','error','-i',paths[0],'-frames:v','1','-vf','scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-y',pixel]);const rgb=await readFile(pixel);assert.ok(rgb[0]>220&&rgb[1]<30&&rgb[2]<30,'Original red reference must be visible in actual MP4');
 assert.equal(new Set(paths).size,3);for(const path of paths)await readFile(path);
 const actual=await p.inspect();assert.match(actual.content[0].type==='text'?actual.content[0].text:'',/rendered-mp4/);assert.equal(actual.content.filter(p=>p.type==='image').length,3);
 const listed=await p.tools.find(t=>t.name==='list_generated_files')!.execute('list',{kind:'video'});assert.equal(JSON.parse((listed.content[0] as {text:string}).text).files.length,3);
 await assert.rejects(p.render(false),/RENDER_ATTEMPT_LIMIT/);assert.equal(p.artifact()?.path,paths[2]);
 const abort=new AbortController();abort.abort();const cancelled=await createProductionTools({source:root,outputRoot:join(root,'output'),skillRoot,toolPaths:{ffmpeg,ffprobe,browser},signal:abort.signal});await assert.rejects(cancelled.saveHtml(draft));
 }finally{await rm(root,{recursive:true,force:true});}
});
