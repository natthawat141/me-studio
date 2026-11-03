import { spawn } from 'node:child_process';
import { rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright-core';
import { loadProject, startAssetServer } from './project.mjs';
import { createRenderJob } from './jobs.mjs';
import { checkTools, runTool, toolEnvironment } from './tools.mjs';

/** Check the actual encoded file before publishing its final filename. */
export function validateOutput(probe, manifest) {
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const [numerator, denominator] = String(video?.r_frame_rate).split('/').map(Number);
  const frameRate = numerator / denominator;
  const duration = Number(probe.format?.duration);
  if (!video || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' ||
      video.width !== manifest.width || video.height !== manifest.height ||
      !Number.isFinite(frameRate) || Math.abs(frameRate - manifest.fps) > 0.01 ||
      !audio || audio.codec_name !== 'aac' || !Number.isFinite(duration) || duration <= 0 ||
      Math.abs(duration - manifest.durationSeconds) > 1 / manifest.fps + 0.15) {
    throw new Error('Encoded MP4 failed validation (video/audio/size/fps/duration)');
  }
}

function encoderArguments(manifest, inputDirectory, output) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'image2pipe', '-framerate', String(manifest.fps), '-vcodec', 'png', '-i', 'pipe:0'];
  if (manifest.audio.length) {
    for (const track of manifest.audio) args.push('-i', join(inputDirectory, track.file));
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
  }
  const tracks = manifest.audio.length ? manifest.audio : [{ startMs: 0, volume: 0 }];
  const filters = tracks.map((track, index) => `[${index + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${track.startMs}:all=1,volume=${track.volume},apad,atrim=duration=${manifest.durationSeconds}[a${index}]`);
  filters.push(`${tracks.map((_, index) => `[a${index}]`).join('')}amix=inputs=${tracks.length}:duration=longest:normalize=0,alimiter=limit=0.95:level=0[audio]`);
  args.push('-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[audio]',
    '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-t', String(manifest.durationSeconds), '-movflags', '+faststart', output);
  return args;
}

/**
 * Local CLI boundary for reviewed input only. This is not an arbitrary-code sandbox.
 * @param {string} manifestPath
 * @param {{ outputRoot?: string, signal?: AbortSignal, onProgress?: (event: Record<string, unknown>) => void, toolPaths?: {browser: string, ffmpeg: string, ffprobe: string} }} options
 */
export async function renderProject(manifestPath, { outputRoot = resolve('.studio/renders'), signal: callerSignal = new AbortController().signal, onProgress = () => {}, toolPaths } = {}) {
  callerSignal.throwIfAborted();
  const project = await loadProject(manifestPath);
  const tools = await checkTools(toolPaths);
  if (!tools.ready) throw new Error('Local tools are missing. Run npm run local:doctor');
  callerSignal.throwIfAborted();
  const signal = AbortSignal.any([callerSignal, AbortSignal.timeout(20 * 60 * 1000)]);
  const { manifest } = project;
  const job = await createRenderJob(project, outputRoot);
  const partial = join(job.directory, 'video.partial.mp4');
  const output = join(job.directory, 'video.mp4');
  const started = performance.now();
  let server;
  let browser;
  let encoder;
  let encoderDone;
  let encoderLog = '';
  let encoderStopped = false;
  const abort = () => {
    encoder?.stdin.destroy();
    encoder?.kill('SIGTERM');
    void browser?.close().catch(() => {});
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    await job.update({ status: 'running' });
    onProgress({ ...job.state });
    server = await startAssetServer(job.inputDirectory, manifest);
    signal.throwIfAborted();
    browser = await chromium.launch({ executablePath: tools.browser.path, headless: true, chromiumSandbox: true, env: toolEnvironment(), timeout: 20_000 });
    signal.throwIfAborted();
    const context = await browser.newContext({ viewport: { width: manifest.width, height: manifest.height }, deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: false, locale: 'th-TH' });
    let resourceFailure = false;
    let scriptFailure = false;
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === server.origin && ['GET', 'HEAD'].includes(route.request().method())) await route.continue();
      else { resourceFailure = true; await route.abort('blockedbyclient'); }
    });
    const page = await context.newPage();
    page.on('pageerror', () => { scriptFailure = true; });
    page.on('requestfailed', () => { resourceFailure = true; });
    page.on('response', (response) => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) resourceFailure = true; });
    await page.addInitScript(() => { window.__SCRUB__ = true; });
    await page.goto(`${server.origin}/${manifest.entry.split('/').map(encodeURIComponent).join('/')}`, { waitUntil: 'load', timeout: 20_000 });
    await page.evaluate(async () => {
      if (typeof window.seek !== 'function') throw new Error('HTML must expose window.seek(milliseconds)');
      document.documentElement.setAttribute('data-h2v-recording', '');
      document.querySelectorAll('[data-h2v-hide]').forEach((element) => { element.style.display = 'none'; });
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      await window.seek(0);
    });
    if (scriptFailure) throw new Error('HTML script failed. Review the animation before rendering');
    if (resourceFailure) throw new Error('An asset failed to load or requested external networking. Bundle all assets in project.json');
    encoder = spawn(tools.ffmpeg, encoderArguments(manifest, job.inputDirectory, partial), { stdio: ['pipe', 'ignore', 'pipe'], env: toolEnvironment() });
    // FFmpeg can reject audio before all frames are written. Always observe both errors.
    encoder.stdin.on('error', () => {});
    encoder.stderr.on('data', (data) => { encoderLog = (encoderLog + data.toString()).slice(-64 * 1024); });
    encoderDone = new Promise((resolve, reject) => {
      encoder.once('error', () => { encoderStopped = true; reject(new Error('Could not start FFmpeg')); });
      encoder.once('close', (code) => {
        encoderStopped = true;
        if (code === 0) resolve(); else reject(new Error('FFmpeg failed. See encoder.log in this render directory'));
      });
    });
    void encoderDone.catch(() => {});
    const total = job.state.totalFrames;
    const captureStart = performance.now();
    let lastProgress = 0;
    await job.update({ stage: 'capturing' });
    for (let frame = 0; frame < total; frame++) {
      signal.throwIfAborted();
      if (encoderStopped) await encoderDone;
      await page.evaluate((ms) => window.seek(ms), frame * 1000 / manifest.fps);
      if (scriptFailure || resourceFailure) throw new Error('Animation or asset failed while seeking. Review the project snapshot');
      const png = await page.screenshot({ type: 'png', animations: 'disabled', timeout: 15_000 });
      if (frame === 0) await writeFile(join(job.directory, 'poster.png'), png);
      await new Promise((resolve, reject) => encoder.stdin.write(png, (error) => error ? reject(error) : resolve()));
      const now = performance.now();
      if (now - lastProgress >= 1000 || frame + 1 === total) {
        await job.update({ framesCompleted: frame + 1 });
        onProgress({ ...job.state });
        lastProgress = now;
      }
    }
    encoder.stdin.end();
    await job.update({ stage: 'encoding', captureMs: Math.round(performance.now() - captureStart) });
    onProgress({ ...job.state });
    await encoderDone;
    signal.throwIfAborted();
    await job.update({ stage: 'validating' });
    const { stdout } = await runTool(tools.ffprobe, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt', '-of', 'json', partial], { signal });
    const probe = JSON.parse(stdout);
    validateOutput(probe, manifest);
    await writeFile(join(job.directory, 'probe.json'), JSON.stringify(probe, null, 2));
    signal.throwIfAborted();
    await rename(partial, output);
    await job.update({ status: 'succeeded', stage: 'complete', output: 'video.mp4', poster: 'poster.png', elapsedMs: Math.round(performance.now() - started), completedAt: new Date().toISOString() });
    onProgress({ ...job.state });
    return { ...job.state, directory: job.directory, outputPath: output };
  } catch (error) {
    const cancelled = callerSignal.aborted;
    const message = cancelled ? 'Render cancelled' : signal.aborted ? 'Render timed out after 20 minutes' : error instanceof Error ? error.message : 'Render failed';
    await job.update({ status: cancelled ? 'cancelled' : 'failed', error: message, elapsedMs: Math.round(performance.now() - started) });
    const failure = new Error(`${message}\nRender: ${job.directory}`);
    failure.name = cancelled ? 'AbortError' : 'Error';
    throw failure;
  } finally {
    signal.removeEventListener('abort', abort);
    if (encoder && !encoderStopped) {
      encoder.stdin.destroy();
      encoder.kill('SIGTERM');
      const timer = setTimeout(() => encoder.kill('SIGKILL'), 2000);
      try { await encoderDone; } catch { /* Failure is already recorded in job.json. */ }
      clearTimeout(timer);
    }
    await browser?.close().catch(() => {});
    await server?.close();
    await rm(partial, { force: true });
    if (encoderLog) await writeFile(join(job.directory, 'encoder.log'), encoderLog, { mode: 0o600 });
  }
}
