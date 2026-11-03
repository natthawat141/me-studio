import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {prepareHtmlPreview} from '../../src/server/video/html-authoring.mjs';
import {createProductionTools,initializeSkills} from '../../src/server/video/production.mjs';
await mkdir('.studio/creative-smoke',{recursive:true});
const source=await mkdtemp(resolve('.studio/creative-smoke/run-'));
const toolPaths={browser:chromium.executablePath(),ffmpeg:resolve('node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg'),ffprobe:resolve('node_modules/@ffprobe-installer/darwin-arm64/ffprobe')};
for(const html of ['<script>throw Error()</script>','<img src="file:///etc/passwd">','<div onclick="alert(1)">bad</div>','<iframe src="http://127.0.0.1"></iframe>','<style>@import "https://example.com";</style>','<svg><foreignObject>bad</foreignObject></svg>']){
 await assert.rejects(prepareHtmlPreview(html,{browser:toolPaths.browser,width:640,height:480,path:join(source,'rejected.png')}));
}
const skillRoot=await initializeSkills(source,resolve('skills')),sessionId='11111111-1111-4111-8111-111111111111';
const first=await createProductionTools({source,outputRoot:join(source,'output'),skillRoot,sessionId,toolPaths});
await first.saveHtml({title:'อบอุ่น',html:'<style>body{background:#f1e2ce;color:#47352b;display:grid;place-items:center;font:40px Georgia}main{animation:fade 1s both}@keyframes fade{from{opacity:0}to{opacity:1}}</style><main>Our story</main>',width:640,height:480,durationSeconds:3,narration:''});
const second=await createProductionTools({source,outputRoot:join(source,'output'),skillRoot,sessionId,toolPaths});
const read=second.tools.find(t=>t.name==='read_current_animation')!;
const result=await read.execute('test',{},new AbortController().signal);
assert.match(JSON.stringify(result),/Our story/);
await assert.rejects(second.render(true),/VOICE_NOT_READY/);
await second.render(false);
assert.ok(second.artifact());
console.log(JSON.stringify({offline:true,negativeCases:6,versionRestored:true,preview:first.previews()[0],artifact:second.artifact()}));
