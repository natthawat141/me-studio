import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepareHtmlPreview} from '../src/server/video/html-authoring.mjs';
import {renderProject} from '../scripts/local/render.mjs';
import {checkTools,toolEnvironment} from '../scripts/local/tools.mjs';

test('encoded MP4 preserves seeked finite and infinite CSS animation frames',async t=>{
 const tools=await checkTools();
 if(!tools.ready){t.skip('Local browser/FFmpeg required for actual encoded-motion regression');return;}
 const root=await mkdtemp(join(tmpdir(),'studio-css-render-'));
 try{
  const html=await prepareHtmlPreview(`<style>
   body{background:#000}.box{position:absolute;top:20px;width:80px;height:80px;opacity:0}
   .finite{left:20px;background:#f00;animation:fade 2s linear forwards}
   .loop{left:140px;background:#00f;animation:fade 2s linear infinite}
   @keyframes fade{from{opacity:0}to{opacity:1}}
   </style><div class="box finite"></div><div class="box loop"></div>`,
   {browser:tools.browser!.path,width:320,height:240,path:join(root,'preview.png')});
  await writeFile(join(root,'scene.html'),html);
  await writeFile(join(root,'project.json'),JSON.stringify({version:1,title:'CSS timing regression',entry:'scene.html',width:320,height:240,fps:24,durationSeconds:2,assets:[],audio:[]}));
  const result=await renderProject(join(root,'project.json'),{outputRoot:join(root,'renders')});
  const channels=(seconds:number)=>{
   const pixels=execFileSync(tools.ffmpeg,['-v','error','-ss',String(seconds),'-i',result.outputPath,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],{env:{...toolEnvironment(),NODE_ENV:'test'},maxBuffer:320*240*3+1024});
   return {red:pixels[(40*320+40)*3],blue:pixels[(40*320+160)*3+2]};
  };
  const start=channels(0),middle=channels(1),end=channels(1.958333);
  assert.ok(start.red<15&&start.blue<15,`animations must start hidden: ${JSON.stringify(start)}`);
  assert.ok(middle.red>110&&middle.red<145&&middle.blue>110&&middle.blue<145,`seek to one second must retain half opacity: ${JSON.stringify(middle)}`);
  assert.ok(end.red>230&&end.blue>230,`both animations must approach completion: ${JSON.stringify(end)}`);
 }finally{await rm(root,{recursive:true,force:true});}
});
