import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject, startAssetServer } from '../scripts/local/project.mjs';
import { renderProject, validateOutput } from '../scripts/local/render.mjs';
import { createRenderJob } from '../scripts/local/jobs.mjs';

const manifest = { version: 1, title: 'Test clip', entry: 'scene.html', width: 320, height: 240, fps: 24, durationSeconds: 1, assets: [], audio: [] };

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'studio-project-'));
  try {
    await writeFile(join(root, 'scene.html'), '<html><body>test</body></html>');
    await writeFile(join(root, 'project.json'), JSON.stringify(manifest));
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('project preserves explicit asset/audio references and paths with spaces', async () => fixture(async (root) => {
  await mkdir(join(root, 'my assets'));
  await writeFile(join(root, 'my assets', 'voice.wav'), Buffer.from('audio fixture'));
  await writeFile(join(root, 'project.json'), JSON.stringify({ ...manifest, audio: [{ file: 'my assets/voice.wav', startMs: 250, volume: 0.8 }] }));
  const project = await loadProject(join(root, 'project.json'));
  assert.deepEqual(project.manifest.audio, [{ file: 'my assets/voice.wav', startMs: 250, volume: 0.8 }]);
  assert.deepEqual(project.files.map((file: { relativePath: string }) => file.relativePath).sort(), ['my assets/voice.wav', 'scene.html']);
}));

test('invalid manifests fail before rendering', async () => fixture(async (root) => {
  for (const patch of [
    { width: 321 }, { durationSeconds: 0 }, { durationSeconds: 301 }, { fps: 120 },
    { entry: '../private.html' }, { entry: '/tmp/private.html' }, { assets: ['.env.local'] },
    { assets: ['https://example.com/file.png'] }, { assets: ['folder/../scene.html'] },
    { entry: 'missing.html' }, { audio: [{ file: 'voice.wav', startMs: 1000, volume: 1 }] },
    { audio: [{ file: 'voice.wav', startMs: 0, volume: 10 }] }, { unexpected: true },
  ]) {
    await writeFile(join(root, 'project.json'), JSON.stringify({ ...manifest, ...patch }));
    await assert.rejects(loadProject(join(root, 'project.json')), JSON.stringify(patch));
  }
}));

test('symlinked assets cannot escape the project directory', async () => fixture(async (root) => {
  const outside = await mkdtemp(join(tmpdir(), 'studio-outside-'));
  try {
    await writeFile(join(outside, 'secret.png'), 'do not serve');
    await symlink(join(outside, 'secret.png'), join(root, 'escape.png'));
    await writeFile(join(root, 'project.json'), JSON.stringify({ ...manifest, assets: ['escape.png'] }));
    await assert.rejects(loadProject(join(root, 'project.json')), /outside|symlink/i);
  } finally { await rm(outside, { recursive: true, force: true }); }
}));

test('asset server serves only snapshotted allowlisted files over loopback', async () => fixture(async (root) => {
  await writeFile(join(root, 'private.json'), '{"private":true}');
  const project = await loadProject(join(root, 'project.json'));
  const server = await startAssetServer(root, project.manifest);
  try {
    const response = await fetch(`${server.origin}/scene.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.equal(await response.text(), await readFile(join(root, 'scene.html'), 'utf8'));
    for (const path of ['/private.json', '/project.json', '/.env.local', '/%2e%2e%2fscene.html']) {
      assert.equal((await fetch(`${server.origin}${path}`, { redirect: 'manual' })).status, 404, path);
    }
    assert.equal((await fetch(`${server.origin}/scene.html`, { method: 'POST' })).status, 405);
  } finally { await server.close(); }
}));

test('renders snapshot inputs and never overwrite earlier render versions', async () => fixture(async (root) => {
  const project = await loadProject(join(root, 'project.json'));
  const outputRoot = join(root, 'renders');
  const first = await createRenderJob(project, outputRoot);
  await writeFile(join(root, 'scene.html'), '<html>new revision</html>');
  const second = await createRenderJob(await loadProject(join(root, 'project.json')), outputRoot);
  assert.notEqual(first.directory, second.directory);
  assert.notEqual(first.state.inputHash, second.state.inputHash);
  assert.equal(await readFile(join(first.inputDirectory, 'scene.html'), 'utf8'), '<html><body>test</body></html>');
  const replay = await loadProject(join(first.inputDirectory, 'project.json'));
  assert.equal(replay.files[0].contents.toString(), '<html><body>test</body></html>');
  await first.update({ status: 'failed', error: 'Test failure' });
  assert.equal(JSON.parse(await readFile(join(first.directory, 'job.json'), 'utf8')).status, 'failed');
}));

test('output validation rejects incorrect codecs, size, timing or missing audio', () => {
  const video = { codec_type: 'video', codec_name: 'h264', width: 320, height: 240, r_frame_rate: '24/1', pix_fmt: 'yuv420p' };
  const audio = { codec_type: 'audio', codec_name: 'aac' };
  const valid = { format: { duration: '1.02' }, streams: [video, audio] };
  assert.doesNotThrow(() => validateOutput(valid, manifest));
  assert.throws(() => validateOutput({ ...valid, streams: [video] }, manifest));
  assert.throws(() => validateOutput({ ...valid, streams: [{ ...video, width: 640 }, audio] }, manifest));
  assert.throws(() => validateOutput({ ...valid, format: { duration: '5.0' } }, manifest));
  assert.throws(() => validateOutput({ ...valid, streams: [{ ...video, codec_name: 'vp9' }, audio] }, manifest));
  assert.throws(() => validateOutput({ ...valid, streams: [{ ...video, r_frame_rate: '30/1' }, audio] }, manifest));
  assert.throws(() => validateOutput({ ...valid, streams: [{ ...video, r_frame_rate: '0/0' }, audio] }, manifest));
});

test('pre-cancelled render does not create jobs or launch processes', async () => fixture(async (root) => {
  const outputRoot = join(root, 'renders');
  await assert.rejects(renderProject(join(root, 'project.json'), { outputRoot, signal: AbortSignal.abort() }), { name: 'AbortError' });
  await assert.rejects(stat(outputRoot), { code: 'ENOENT' });
}));
