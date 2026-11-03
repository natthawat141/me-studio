import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { runtimeEnvironment, APP_ORIGIN } from './policy.mjs';

/** The child reports readiness only after its own listener has started. */
export async function startRuntime(root) {
  const nonce = randomUUID();
  const child = spawn(join(root, 'bin/node'), [join(root, 'desktop/ui-server.mjs'), join(root, 'app')], {
    env: { ...runtimeEnvironment(), STUDIO_BOOT_NONCE: nonce, STUDIO_MODE: 'demo' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  // Never forward framework/environment diagnostics into the renderer.
  child.stderr.on('data', () => {});
  const stop = async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await new Promise(resolve => { const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 2500); child.once('exit', () => { clearTimeout(timer); resolve(); }); });
  };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('DESKTOP_START_TIMEOUT')), 25_000);
      const cleanup = () => { clearTimeout(timer); child.off('message', ready); child.off('error', failed); child.off('exit', exited); };
      const ready = value => { if (value?.kind === 'ready' && value.nonce === nonce) { cleanup(); resolve(); } };
      const failed = () => { cleanup(); reject(new Error('DESKTOP_START_FAILED')); };
      const exited = () => { cleanup(); reject(new Error('DESKTOP_SERVER_EXITED')); };
      child.on('message', ready); child.once('error', failed); child.once('exit', exited);
    });
    return { origin: APP_ORIGIN, stop, child };
  } catch (error) { await stop(); throw error; }
}
