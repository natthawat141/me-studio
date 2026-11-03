import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,symlink,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceFiles } from '../desktop/workspace-files.mjs';

test('selected folder lists lazily, hides dotfiles, rejects forged IDs and escaping symlinks', async () => {
  const root=await mkdtemp(join(tmpdir(),'studio-files-'));
  try {
    await mkdir(join(root,'output')); await writeFile(join(root,'.env'),'private');
    await writeFile(join(root,'output','clip.mp4'),'0123456789');
    await symlink('/etc/passwd',join(root,'outside.txt'));
    const service=new WorkspaceFiles(); const folder=await service.openRoot(root);
    assert.deepEqual(folder.entries.map((e:{name:string})=>e.name),['output']);
    await assert.rejects(service.list('../../outside'),/INVALID_FILE/);
    const listing=await service.list(folder.entries[0].id);
    const file=await service.preview(listing.entries[0].id);
    assert.equal(file.kind,'video'); assert.ok(file.src); assert.match(file.src,/^studio-file:\/\//);
    assert.ok(!JSON.stringify(folder).includes(root));
    await rm(join(root,'output','clip.mp4')); await symlink('/etc/passwd',join(root,'output','clip.mp4'));
    await assert.rejects(service.preview(listing.entries[0].id),/FILE_OUTSIDE_FOLDER/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('media supports byte ranges, suffix requests and HEAD, and text is bounded and never executed', async () => {
  const root=await mkdtemp(join(tmpdir(),'studio-media-'));
  try {
    await writeFile(join(root,'clip.mp4'),'0123456789'); await writeFile(join(root,'scene.html'),'<script>danger()</script>');
    await writeFile(join(root,'large.txt'),'x'.repeat(300_000));
    const service=new WorkspaceFiles(); const folder=await service.openRoot(root);
    const clip=await service.preview(folder.entries.find((e:{name:string})=>e.name==='clip.mp4')!.id);
    assert.ok(clip.src);
    const response=await service.serve(new Request(clip.src,{headers:{Range:'bytes=2-5'}}));
    assert.equal(response.status,206); assert.equal(response.headers.get('Content-Range'),'bytes 2-5/10'); assert.equal(await response.text(),'2345');
    const suffix=await service.serve(new Request(clip.src,{headers:{Range:'bytes=-2'}})); assert.equal(await suffix.text(),'89');
    assert.equal((await service.serve(new Request(clip.src,{headers:{Range:'bytes=20-'}}))).status,416);
    const head=await service.serve(new Request(clip.src,{method:'HEAD'}));assert.equal(head.headers.get('Content-Length'),'10');assert.equal(await head.text(),'');
    const html=await service.preview(folder.entries.find((e:{name:string})=>e.name==='scene.html')!.id);
    assert.equal(html.kind,'text'); assert.equal(html.text,'<script>danger()</script>');
    await assert.rejects(service.preview(folder.entries.find((e:{name:string})=>e.name==='large.txt')!.id),/FILE_TOO_LARGE/);
    await service.openRoot(root); assert.equal((await service.serve(new Request(clip.src))).status,404);
  } finally {await rm(root,{recursive:true,force:true});}
});
