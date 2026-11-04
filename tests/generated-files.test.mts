import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGeneratedFiles} from '../src/server/video/generated-files.mjs';

test('generated PNG/video IDs survive restart, scope sessions, support separate output and recheck filesystem grants',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-generated-'));
 try{
  const source=join(root,'source'),output=join(root,'output'),state=join(root,'state');for(const p of [source,output,state])await mkdir(p);
  const sessionId=randomUUID(),options={stateRoot:state,sessionId,roots:[source,output]};
  const png=join(output,'poster.png'),mp4=join(output,'clip.mp4');await writeFile(png,'PNG fixture');await writeFile(mp4,'MP4 fixture');
  const first=await createGeneratedFiles(options),image=await first.remember(png,output,'Price 69'),video=await first.remember(mp4,output,'Six seconds');
  const reopened=await createGeneratedFiles(options);assert.equal((await reopened.list('image'))[0].id,image.id);assert.equal((await reopened.resolve(video.id)).absolutePath,await realpath(mp4));assert.equal(await readFile(png,'utf8'),'PNG fixture');
  const other=await createGeneratedFiles({...options,sessionId:randomUUID()});await assert.rejects(other.resolve(image.id),/ARTIFACT_NOT_FOUND/);
  const relinked=await createGeneratedFiles({...options,roots:[source]});assert.deepEqual(await relinked.list(),[]);await assert.rejects(relinked.resolve(video.id),/PROJECT_PATH_DENIED/);
  await rm(png);await symlink(mp4,png);assert.deepEqual(await reopened.list('image'),[]);await assert.rejects(reopened.resolve(image.id),/PROJECT_PATH_DENIED/);
  await assert.rejects(first.remember(join(state,'private.txt'),state),/PROJECT_PATH_DENIED/);
  await writeFile(join(state,`generated-${sessionId}.json`),'bad data');await assert.rejects(createGeneratedFiles(options),/INVALID_PROJECT_STATE/);assert.equal(await readFile(join(state,`generated-${sessionId}.json`),'utf8'),'bad data');
 }finally{await rm(root,{recursive:true,force:true});}
});
