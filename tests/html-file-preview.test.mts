import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {findBrowser} from '../scripts/local/tools.mjs';
import {compileFilePreview} from '../src/server/video/file-preview.mjs';
test('local HTML preview compiles assets without network, preserves source and rejects escapes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-file-preview-'));const browser=findBrowser();assert.ok(browser);
 try{await mkdir(join(root,'assets'));await writeFile(join(root,'assets/a.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'));
 const html='<meta charset="utf-8"><style>@keyframes a{to{opacity:.5}}img{animation:a 1s infinite}</style><img src="assets/a.png">';await writeFile(join(root,'preview.html'),html);
 const result=await compileFilePreview({path:join(root,'preview.html'),root,browser:browser.path,width:320,height:320,screenshot:join(root,'capture.png')});
 assert.match(result.html,/data:image\/png;base64/);assert.equal(await readFile(join(root,'preview.html'),'utf8'),html);assert.ok((await readFile(join(root,'capture.png'))).length>100);
 await symlink('/etc/hosts',join(root,'escape.html'));await assert.rejects(compileFilePreview({path:join(root,'escape.html'),root,browser:browser.path}),/PROJECT_PATH_DENIED/);
 await writeFile(join(root,'bad.html'),'<meta http-equiv="refresh" content="0;url=https://example.com">');await assert.rejects(compileFilePreview({path:join(root,'bad.html'),root,browser:browser.path}),/HTML_ACTIVE_CONTENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
