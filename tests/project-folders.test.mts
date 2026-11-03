import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rename, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectFolders } from '../desktop/project-folders.mjs';

test('folder projects persist stable identity, relink a moved folder and preserve corrupt registry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'studio-folder-projects-'));
  try {
    const folder = join(root, 'videos'); const moved = join(root, 'moved'); const registry = join(root, 'state', 'projects.json');
    await mkdir(folder); const store = new ProjectFolders(registry);
    const project = await store.create('ช่องของฉัน', folder);
    assert.deepEqual(await new ProjectFolders(registry).list(), [project]);
    await assert.rejects(store.create('ซ้ำ', folder), /DUPLICATE_FOLDER/);
    await rename(folder, moved); await assert.rejects(async () => await import('node:fs/promises').then(fs => fs.stat(folder)));
    assert.deepEqual(await store.relink(project.id, moved), {...project,folderName:'moved',sourcePath:await realpath(moved),outputPath:join(await realpath(moved),'output')});
    assert.equal(await store.pathFor(project.id), await realpath(moved));
    const updated=await store.setOutput(project.id,moved);
    assert.equal(updated.outputPath,await realpath(moved));
    assert.equal((await new ProjectFolders(registry).list())[0].outputPath,updated.outputPath);
    await assert.rejects(store.setOutput('missing',moved),/INVALID_PROJECT/);
    await writeFile(registry, '{bad'); await assert.rejects(store.create('new', moved));
    assert.equal(await readFile(registry, 'utf8'), '{bad');
  } finally { await rm(root, {recursive:true,force:true}); }
});
