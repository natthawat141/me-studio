import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { checkTools, toolEnvironment } from './tools.mjs';

const initial = await checkTools();
if (!initial.checks.find((check) => check.name === 'Node.js')?.ready) {
  console.error('ต้องใช้ Node.js 22.19 ขึ้นไป');
  process.exitCode = 1;
} else {
  if (!initial.browser) {
    console.log('ติดตั้ง Chromium จาก Playwright สำหรับเรนเดอร์ในเครื่อง...');
    const require = createRequire(import.meta.url);
    const installed = await new Promise((resolve) => {
      const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'install', 'chromium'], { stdio: 'inherit', env: toolEnvironment() });
      child.once('error', () => resolve(false));
      child.once('close', (code) => resolve(code === 0));
    });
    if (!installed) process.exitCode = 1;
  }
  const result = await checkTools();
  for (const check of result.checks) console.log(`${check.ready ? 'พร้อม' : 'ยังไม่พร้อม'}  ${check.name}${check.ready ? '' : ` — ${check.help}`}`);
  if (!result.ready) process.exitCode = 1;
}
