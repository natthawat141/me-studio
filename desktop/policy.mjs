export const APP_ORIGIN = 'http://127.0.0.1:18147';

export function trustedSender(url, mainFrame) {
  try { return mainFrame && new URL(url).origin === APP_ORIGIN; } catch { return false; }
}

export function allowDesktopPermission(contents, owner, permission, details) {
  return Boolean(owner && contents === owner && permission === 'fullscreen' && trustedSender(details?.requestingUrl, details?.isMainFrame === true));
}

export function runtimeEnvironment(parent = process.env) {
  const allowed = ['HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'];
  return Object.fromEntries(allowed.filter(key => parent[key] !== undefined).map(key => [key, parent[key]]));
}

/** Fixed safe codes only; never expose raw filesystem/provider diagnostics. */
export function fileOperationError(error) {
  const allowed = ['PROJECT_BUSY','PROJECT_CONFLICT','INVALID_EDIT','FOLDER_BUSY','VIDEO_BUSY','INVALID_FILE','INVALID_FOLDER','FILE_OUTSIDE_FOLDER','FILE_TOO_LARGE','FOLDER_LIMIT','INVALID_PROJECT','INVALID_REGISTRY','DUPLICATE_FOLDER','INVALID_CONFIG','INVALID_DEFAULT_MODEL','CONFIG_OPEN_FAILED','MODEL_NOT_AVAILABLE','ATTACHMENT_LIMIT','INVALID_IMAGE','DESKTOP_REQUEST_TIMEOUT','DESKTOP_WORKER_EXITED'];
  return error instanceof Error && allowed.includes(error.message) ? error.message : 'FILE_READ_FAILED';
}
