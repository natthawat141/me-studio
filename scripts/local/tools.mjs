import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';

const exec = promisify(execFile);

/** Provider keys and other application secrets are not inherited by rendering tools. */
export function toolEnvironment() {
  const names = ['PATH', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ', 'DISPLAY', 'XDG_RUNTIME_DIR'];
  return Object.fromEntries(names.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]));
}

export async function runTool(command, args, options = {}) {
  return exec(command, args, { env: toolEnvironment(), encoding: 'utf8', timeout: 15_000, maxBuffer: 1024 * 1024, ...options });
}

export function findBrowser() {
  const candidates = [{ label: 'Playwright Chromium', path: chromium.executablePath() }];
  if (process.platform === 'darwin') candidates.push({ label: 'Google Chrome (isolated render process)', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  if (process.platform === 'linux') for (const path of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) candidates.push({ label: 'System Chromium/Chrome (isolated render process)', path });
  if (process.platform === 'win32') for (const base of [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean)) candidates.push({ label: 'Google Chrome (isolated render process)', path: join(base, 'Google', 'Chrome', 'Application', 'chrome.exe') });
  return candidates.find((candidate) => existsSync(candidate.path)) ?? null;
}

export async function checkTools(paths) {
  const ffmpeg = paths?.ffmpeg ?? 'ffmpeg';
  const ffprobe = paths?.ffprobe ?? 'ffprobe';
  const checks = await Promise.all(['ffmpeg', 'ffprobe'].map(async (name) => {
    try {
      const { stdout } = await runTool(name === 'ffmpeg' ? ffmpeg : ffprobe, ['-version']);
      return { name, ready: true, version: stdout.split('\n')[0], help: '' };
    } catch {
      return { name, ready: false, version: '', help: process.platform === 'darwin' ? 'ติดตั้ง FFmpeg ด้วย brew install ffmpeg แล้วรันตรวจอีกครั้ง' : 'ติดตั้ง FFmpeg และ ffprobe จาก https://ffmpeg.org/download.html และเพิ่มลง PATH' };
    }
  }));
  const browser = paths?.browser ? { label: 'Bundled Chromium', path: paths.browser } : findBrowser();
  const [major, minor] = process.versions.node.split('.').map(Number);
  checks.unshift({ name: 'Node.js', ready: major > 22 || (major === 22 && minor >= 19), version: process.version, help: 'ใช้ Node.js 22.19 ขึ้นไป' });
  checks.push({ name: 'Browser', ready: Boolean(browser), version: browser?.label ?? '', help: 'รัน npm run local:setup เพื่อติดตั้ง Chromium สำหรับเรนเดอร์' });
  return { ready: checks.every((check) => check.ready), checks, browser, ffmpeg, ffprobe };
}
