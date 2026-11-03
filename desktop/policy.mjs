export const APP_ORIGIN = 'http://127.0.0.1:18147';

export function trustedSender(url, mainFrame) {
  try { return mainFrame && new URL(url).origin === APP_ORIGIN; } catch { return false; }
}

export function runtimeEnvironment(parent = process.env) {
  const allowed = ['HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'];
  return Object.fromEntries(allowed.filter(key => parent[key] !== undefined).map(key => [key, parent[key]]));
}
