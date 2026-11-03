import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const safePath = z.string().min(1).max(240).refine((value) =>
  !isAbsolute(value) && !/[\\:%?#\x00-\x1f]/.test(value) &&
  value.split('/').every((part) => part.length > 0 && !part.startsWith('.')) &&
  Object.hasOwn(mime, extname(value).toLowerCase()), 'Use an explicit relative media/code path without hidden or parent directories');
const dimension = z.number().int().min(64).max(1920).refine((value) => value % 2 === 0, 'Dimensions must be even');
export const projectSchema = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).max(160),
  entry: safePath.refine((value) => extname(value).toLowerCase() === '.html', 'Entry must be HTML'),
  width: dimension,
  height: dimension,
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  durationSeconds: z.number().finite().positive().max(300),
  assets: z.array(safePath).max(100).default([]),
  audio: z.array(z.object({
    file: safePath.refine((value) => ['.mp3', '.wav', '.m4a', '.ogg'].includes(extname(value).toLowerCase()), 'Unsupported audio format'),
    startMs: z.number().int().nonnegative().default(0),
    volume: z.number().finite().min(0).max(2).default(1),
  }).strict()).max(24).default([]),
}).strict().refine((value) => value.audio.every((track) => track.startMs < value.durationSeconds * 1000), 'Audio must start within the clip');

export function projectPaths(manifest) {
  return [...new Set([manifest.entry, ...manifest.assets, ...manifest.audio.map((track) => track.file)])];
}

export async function loadProject(manifestPath) {
  const manifestFile = await realpath(resolve(manifestPath));
  if ((await stat(manifestFile)).size > 64 * 1024) throw new Error('Project manifest exceeds 64 KiB');
  const root = dirname(manifestFile);
  const manifest = projectSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));
  const files = [];
  let totalBytes = 0;
  for (const relativePath of projectPaths(manifest)) {
    const file = await realpath(resolve(root, relativePath));
    const fromRoot = relative(root, file);
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) throw new Error('Asset symlink points outside the project');
    // A symlink to a hidden file inside the project must not bypass the allowlist either.
    safePath.parse(fromRoot.split('\\').join('/'));
    const info = await stat(file);
    if (!info.isFile() || info.size > 50 * 1024 * 1024) throw new Error('Each input must be a file smaller than 50 MiB');
    const contents = await readFile(file);
    totalBytes += contents.length;
    if (contents.length > 50 * 1024 * 1024 || totalBytes > 250 * 1024 * 1024) throw new Error('Project input exceeds 250 MiB');
    files.push({ relativePath, contents });
  }
  return { manifest, files };
}

/** Serves only an explicit snapshot; not an arbitrary filesystem or upload endpoint. */
export async function startAssetServer(root, manifest) {
  const contents = new Map();
  for (const path of projectPaths(manifest)) contents.set(`/${path}`, await readFile(resolve(root, path)));
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
    }
    let path;
    try { path = decodeURIComponent((request.url ?? '').split('?')[0]); }
    catch { response.writeHead(404).end(); return; }
    const bytes = contents.get(path);
    if (!bytes) { response.writeHead(404).end(); return; }
    response.writeHead(200, {
      'Content-Type': mime[extname(path).toLowerCase()],
      'Content-Length': bytes.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}
