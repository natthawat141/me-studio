import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderProject } from './render.mjs';
import { runTool, checkTools } from './tools.mjs';

if (!(await checkTools()).ready) throw new Error('Run npm run local:doctor and resolve missing tools first');
const root = await mkdtemp(join(tmpdir(), 'me-studio-render-smoke-'));
const outputRoot = join(root, 'renders');
const manifestPath = join(root, 'project.json');
const animation = '<!doctype html><html><body style="margin:0"><script>window.seek = ms => { document.body.style.background = ms < 500 ? "rgb(255,0,0)" : "rgb(0,0,255)"; }; window.seek(0);</script></body></html>';
const manifest = { version: 1, title: 'Renderer integration fixture', entry: 'scene.html', width: 320, height: 240, fps: 24, durationSeconds: 1, assets: [], audio: [{ file: 'voice.wav', startMs: 250, volume: 1 }] };
const files = async () => Promise.all((await readdir(outputRoot)).map(async (id) => ({ directory: join(outputRoot, id), ...JSON.parse(await readFile(join(outputRoot, id, 'job.json'), 'utf8')) })));
try {
  await writeFile(join(root, 'scene.html'), animation);
  await writeFile(manifestPath, JSON.stringify(manifest));
  await runTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=0.4', join(root, 'voice.wav')]);
  const result = await renderProject(manifestPath, { outputRoot });
  assert.equal(result.status, 'succeeded');
  assert.equal(result.framesCompleted, 24);
  assert.ok((await stat(result.outputPath)).size > 1000);
  assert.equal(await readFile(join(result.directory, 'input', 'scene.html'), 'utf8'), animation);

  for (const [seconds, expectedChannel] of [[0.1, 0], [0.8, 2]]) {
    const { stdout } = await runTool('ffmpeg', ['-v', 'error', '-ss', String(seconds), '-i', result.outputPath, '-frames:v', '1', '-vf', 'scale=1:1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], { encoding: 'buffer' });
    assert.ok(stdout[expectedChannel] > 200, 'seek-driven frame color must change at 500 ms');
    assert.ok(stdout[expectedChannel === 0 ? 2 : 0] < 30);
  }
  const { stdout: samples } = await runTool('ffmpeg', ['-v', 'error', '-i', result.outputPath, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], { encoding: 'buffer' });
  const energy = (start, end) => {
    let sum = 0;
    for (let i = Math.floor(start * 48000); i < Math.floor(end * 48000); i++) sum += samples.readFloatLE(i * 4) ** 2;
    return sum / ((end - start) * 48000);
  };
  assert.ok(energy(0, 0.15) < 0.000001, 'audio must be silent before its 250 ms offset');
  assert.ok(energy(0.35, 0.5) > 0.0001, 'timed audio must actually be audible after its offset');
  console.log('PASS: real H.264/AAC MP4, seek-driven frames, audio offset/energy, input snapshot');

  const replay = await renderProject(join(result.directory, 'input', 'project.json'), { outputRoot });
  assert.notEqual(replay.id, result.id);
  assert.equal(replay.inputHash, result.inputHash);
  console.log('PASS: input snapshot re-renders as a separate immutable version');

  await writeFile(manifestPath, JSON.stringify({ ...manifest, audio: [] }));
  const silent = await renderProject(manifestPath, { outputRoot });
  assert.equal(silent.status, 'succeeded');
  await writeFile(manifestPath, JSON.stringify(manifest));
  console.log('PASS: projects without narration export with a silent AAC track');

  await writeFile(join(root, 'scene.html'), '<!doctype html><html><body>No seek contract</body></html>');
  await assert.rejects(renderProject(manifestPath, { outputRoot }), /seek/);
  assert.ok((await files()).some((job) => job.status === 'failed' && /seek/.test(job.error)));
  console.log('PASS: missing seek fails and persists a failed job');

  await writeFile(join(root, 'scene.html'), animation.replace('<body style="margin:0">', '<body style="margin:0"><img src="https://example.invalid/blocked.png">'));
  await assert.rejects(renderProject(manifestPath, { outputRoot }));
  assert.equal((await files()).filter((job) => job.status === 'succeeded').length, 3);
  console.log('PASS: external asset request is blocked; no successful artifact');

  await writeFile(join(root, 'scene.html'), animation);
  const cancel = new AbortController();
  await assert.rejects(renderProject(manifestPath, { outputRoot, signal: cancel.signal, onProgress: (event) => {
    if (Number(event.framesCompleted) >= 1) cancel.abort();
  } }), { name: 'AbortError' });
  const cancelled = (await files()).find((job) => job.status === 'cancelled');
  assert.ok(cancelled);
  await assert.rejects(stat(join(cancelled.directory, 'video.mp4')), { code: 'ENOENT' });
  console.log('PASS: mid-render cancellation persists cancelled status and no partial MP4');

  await writeFile(join(root, 'voice.wav'), 'invalid audio file');
  await assert.rejects(renderProject(manifestPath, { outputRoot }));
  assert.equal((await files()).filter((job) => job.status === 'succeeded').length, 3);
  assert.ok((await files()).every((job) => ['succeeded', 'failed', 'cancelled'].includes(job.status)));
  console.log('PASS: encoder/media failure settles jobs without publishing a partial MP4');
} finally {
  await rm(root, { recursive: true, force: true });
}
