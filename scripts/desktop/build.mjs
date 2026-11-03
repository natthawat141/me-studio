import { build } from 'esbuild';
import { mkdir, cp, copyFile, writeFile, readFile, realpath, chmod, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const root = resolve('.studio/desktop-build');
const runtime = join(root, 'runtime');
await mkdir(join(runtime, 'desktop'), { recursive: true });
await mkdir(join(runtime, 'bin'), { recursive: true });
await mkdir(join(root, 'app'), { recursive: true });
await mkdir('dist-desktop', { recursive: true });
await build({ entryPoints: ['desktop/main.mjs'], outfile: 'dist-desktop/main.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['electron'] });
await copyFile('desktop/preload.cjs', 'dist-desktop/preload.cjs');
await build({ entryPoints: ['desktop/worker.mts'], outfile: join(runtime, 'desktop/worker.mjs'), bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['playwright-core'], banner: { js: "import { createRequire as __studioCreateRequire } from 'node:module'; const require = __studioCreateRequire(import.meta.url);" } });
await copyFile('desktop/ui-server.mjs', join(runtime, 'desktop/ui-server.mjs'));
await cp('.next/standalone', join(runtime, 'app'), { recursive: true, filter: path => !basename(path).startsWith('.env') });
await cp('public', join(runtime, 'app/public'), { recursive: true });
await cp('.next/static', join(runtime, 'app/.next/static'), { recursive: true });
await cp('skills',join(runtime,'skills'),{recursive:true});
await cp('examples/local-render', join(runtime, 'examples/local-render'), { recursive: true });
await mkdir(join(runtime, 'node_modules'), { recursive: true });
await cp(await realpath('node_modules/playwright-core'), join(runtime, 'node_modules/playwright-core'), { recursive: true });
const browser = chromium.executablePath();
// Copy its whole framework/resources closure, not the executable alone.
const browserRoot = resolve(browser, '../../../../..');
await rm(join(runtime, 'browser'), { recursive: true, force: true });
await cp(browserRoot, join(runtime, 'browser'), { recursive: true, verbatimSymlinks: true });
for (const [name, source] of [['ffmpeg', 'node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg'], ['ffprobe', 'node_modules/@ffprobe-installer/darwin-arm64/ffprobe']]) {
  await copyFile(source, join(runtime, 'bin', name)); await chmod(join(runtime, 'bin', name), 0o755);
}
const nodeVersion = '22.22.3';
const archiveName = `node-v${nodeVersion}-darwin-arm64.tar.gz`;
const archive = join(root, archiveName);
let bytes;
try { bytes = await readFile(archive); } catch { const response = await fetch(`https://nodejs.org/dist/v${nodeVersion}/${archiveName}`); if (!response.ok) throw new Error('NODE_DOWNLOAD_FAILED'); bytes = Buffer.from(await response.arrayBuffer()); }
const checksums = await (await fetch(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`)).text();
const expected = checksums.split('\n').find(line => line.trim().endsWith(` ${archiveName}`))?.trim().split(/\s+/)[0];
const digest = createHash('sha256').update(bytes).digest('hex');
if (!expected || expected !== digest) throw new Error('NODE_CHECKSUM_FAILED');
await writeFile(archive, bytes);
const unpack = join(root, 'node-unpack'); await mkdir(unpack, { recursive: true });
execFileSync('/usr/bin/tar', ['-xzf', archive, '-C', unpack, `node-v${nodeVersion}-darwin-arm64/bin/node`]);
await copyFile(join(unpack, `node-v${nodeVersion}-darwin-arm64/bin/node`), join(runtime, 'bin/node'));
await chmod(join(runtime, 'bin/node'), 0o755);
if (execFileSync(join(runtime, 'bin/node'), ['--version'], { encoding: 'utf8' }).trim() !== `v${nodeVersion}`) throw new Error('NODE_VERSION_FAILED');
await cp('dist-desktop', join(root, 'app'), { recursive: true });
await writeFile(join(root, 'app/package.json'), JSON.stringify({ name: 'me-studio-desktop', version: '0.1.0', description: 'Local cartoon studio', author: 'me studio', main: 'main.mjs', type: 'module' }, null, 2));
await mkdir(join(runtime, 'notices'), { recursive: true });
await copyFile('THIRD_PARTY_NOTICES.md', join(runtime, 'notices/THIRD_PARTY_NOTICES.md'));
await copyFile('src/components/prompt-kit/LICENSE', join(runtime, 'notices/PROMPT-KIT-LICENSE'));
for (const packagePath of ['@ffmpeg-installer/darwin-arm64', '@ffprobe-installer/darwin-arm64', 'playwright-core']) {
  const destination = join(runtime, 'notices', packagePath.replaceAll('/', '-'));
  await mkdir(destination, { recursive: true });
  for (const filename of ['package.json', 'LICENSE', 'LICENSE.md', 'NOTICE', 'README.md']) {
    try { await copyFile(join('node_modules', packagePath, filename), join(destination, filename)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
await writeFile(join(runtime, 'runtime.json'), JSON.stringify({ node: nodeVersion, nodeArchiveSha256: digest, browser: basename(dirname(browserRoot)), target: 'darwin-arm64', builtAt: new Date().toISOString() }, null, 2));
console.log(`Desktop resources staged: ${runtime}`);
