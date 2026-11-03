import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export async function createRenderJob(project, outputRoot) {
  const id = randomUUID();
  const directory = resolve(outputRoot, id);
  const inputDirectory = join(directory, 'input');
  await mkdir(inputDirectory, { recursive: true, mode: 0o700 });
  const hash = createHash('sha256').update(JSON.stringify(project.manifest));
  for (const file of project.files) {
    hash.update(file.relativePath).update(createHash('sha256').update(file.contents).digest());
    const destination = join(inputDirectory, file.relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.contents, { flag: 'wx', mode: 0o600 });
  }
  await writeFile(join(inputDirectory, 'project.json'), JSON.stringify(project.manifest, null, 2), { flag: 'wx', mode: 0o600 });
  const state = {
    version: 1, id, title: project.manifest.title, status: 'queued', stage: 'preparing',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    inputHash: hash.digest('hex'), totalFrames: Math.ceil(project.manifest.durationSeconds * project.manifest.fps), framesCompleted: 0,
    durationSeconds: project.manifest.durationSeconds, width: project.manifest.width,
    height: project.manifest.height, fps: project.manifest.fps,
  };
  async function update(patch) {
    Object.assign(state, patch, { updatedAt: new Date().toISOString() });
    await writeFile(join(directory, 'job.json.tmp'), JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(join(directory, 'job.json.tmp'), join(directory, 'job.json'));
  }
  await update({});
  return { directory, inputDirectory, state, update };
}
