import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {findBrowser} from '../scripts/local/tools.mjs';
import {prepareHtmlPreview} from '../src/server/video/html-authoring.mjs';
test('full HTML metadata is safe while redirect and active content are rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-html-meta-'));const browser=findBrowser();assert.ok(browser);
 const options={browser:browser.path,width:320,height:320,path:join(dir,'preview.png')};
 try{
  await prepareHtmlPreview('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Test</title></head><body><p>ทดสอบ</p></body></html>',options);
  await assert.rejects(prepareHtmlPreview('<meta http-equiv="refresh" content="0;url=https://example.com">',options),/HTML_ACTIVE_CONTENT/);
  await assert.rejects(prepareHtmlPreview('<script>alert(1)</script>',options),/HTML_ACTIVE_CONTENT/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
