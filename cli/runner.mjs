import { parseArgs, parseEnv } from 'node:util';
import { lstat, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tsImport } from 'tsx/esm/api';
import { checkTools } from '../scripts/local/tools.mjs';

// Share the application's validation/projection, not a second model catalog.
const { buildCatalog } = await tsImport('../src/lib/provider-config.ts', import.meta.url);
const lists = { openai: 'STUDIO_OPENAI_MODELS', openrouter: 'STUDIO_CHAT_MODELS', meta: 'STUDIO_META_MODELS' };
const usage = `me studio CLI

  node cli/me-studio.mjs doctor [--env-file PATH] [--json]
  node cli/me-studio.mjs providers list [--env-file PATH] [--json]
  node cli/me-studio.mjs models list [--provider ID] [--env-file PATH] [--json]
  node cli/me-studio.mjs config show [--env-file PATH] [--json]
  node cli/me-studio.mjs config set chat.model MODEL --provider ID --env-file PATH [--label NAME]
  node cli/me-studio.mjs config set mode demo|self-hosted|saas --env-file PATH
  node cli/me-studio.mjs config set speech.voice ID --env-file PATH [--label NAME]

Lists show locally configured models, not a live provider catalog.
Changes update the chosen env file; they do not change an open Desktop session.
No API calls, credentials writes, global install or native-data changes.
`;
class CliError extends Error {}
const fail = code => { throw new CliError(code); };

async function snapshot(path, allowMissing = false) {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.nlink !== 1 || info.size > 1024 * 1024) fail('UNSAFE_ENV_FILE');
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') { if (allowMissing) return ''; fail('ENV_FILE_NOT_FOUND'); }
    throw error;
  }
}
function validate(env) {
  try { return buildCatalog(env); } catch { fail('INVALID_CONFIG'); }
}
function parsed(raw) {
  try { return parseEnv(raw); } catch { fail('INVALID_ENV_FILE'); }
}
function modelId(value) {
  if (!value || value.length > 200 || !/^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]*$/.test(value)) fail('INVALID_MODEL_ID');
  return value;
}
function label(value, fallback) {
  const text = value ?? fallback;
  if (!text.trim() || text.length > 100 || /[\r\n\0]/.test(text)) fail('INVALID_LABEL');
  return text;
}
function quote(value) {
  if (/[\r\n\0]/.test(value)) fail('INVALID_VALUE');
  for (const delimiter of ["'", '`', '"']) if (!value.includes(delimiter)) return delimiter + value + delimiter;
  fail('UNSUPPORTED_QUOTES');
}

// Replace only owned metadata assignments. Unrelated lines/credentials remain
// byte-for-byte intact, including comments and multiline quoted values.
export function patchMetadata(raw, updates) {
  const lines = raw.split(/(?<=\n)/);
  const found = new Set();
  const result = [];
  for (let index = 0; index < lines.length; index++) {
    const start = lines[index];
    const match = start.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\r\n]*)/);
    let end = index;
    const delimiter = match?.[2]?.[0];
    if (match && ["'", '"', '`'].includes(delimiter)) {
      let body = match[2].slice(1);
      while (!body.includes(delimiter) && end + 1 < lines.length) body += lines[++end];
      if (!body.includes(delimiter)) fail('INVALID_ENV_FILE');
    }
    if (match && Object.hasOwn(updates, match[1])) {
      if (!found.has(match[1])) result.push(`${match[1]}=${quote(updates[match[1]])}${start.endsWith('\r\n') ? '\r\n' : '\n'}`);
      found.add(match[1]);
    } else result.push(...lines.slice(index, end + 1));
    index = end;
  }
  let next = result.join('');
  for (const [key, value] of Object.entries(updates)) if (!found.has(key)) {
    if (next && !next.endsWith('\n')) next += '\n';
    next += `${key}=${quote(value)}\n`;
  }
  // Validate our serialization rather than silently losing quote characters.
  const actual = parsed(next);
  if (Object.entries(updates).some(([key, value]) => actual[key] !== value)) fail('INVALID_SERIALIZATION');
  return next;
}

async function writeMetadata(path, original, next) {
  const lockPath = `${path}.me-studio-lock`;
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') fail('CONFIG_BUSY'); throw error; }
  const tempPath = `${path}.${randomUUID()}.tmp`;
  let tempCreated = false;
  try {
    if (await snapshot(path, true) !== original) fail('CONFIG_CHANGED_RETRY');
    const temp = await open(tempPath, 'wx', 0o600); tempCreated = true;
    try { await temp.writeFile(next); await temp.sync(); } finally { await temp.close(); }
    // Detect a concurrent editor before replacing the original file.
    if (await snapshot(path, true) !== original) fail('CONFIG_CHANGED_RETRY');
    await rename(tempPath, path); tempCreated = false;
  } finally {
    if (tempCreated) await unlink(tempPath);
    await lock.close(); await unlink(lockPath);
  }
}

export async function run(argv, context = {}) {
  const out = context.stdout ?? (text => process.stdout.write(text + '\n'));
  const err = context.stderr ?? (text => process.stderr.write(text + '\n'));
  let json = argv.includes('--json');
  const output = value => out(JSON.stringify(value, null, json ? 2 : 0));
  try {
    const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, strict: true, options: {
      'env-file': { type: 'string' }, provider: { type: 'string' }, label: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    } });
    json = !!values.json;
    if (values.help || !positionals.length) { out(usage); return 0; }
    const [command, action, key, value] = positionals;
    const mutating = command === 'config' && action === 'set';
    const valid = (command === 'doctor' && positionals.length === 1)
      || (['providers', 'models'].includes(command) && action === 'list' && positionals.length === 2)
      || (command === 'config' && action === 'show' && positionals.length === 2)
      || (mutating && positionals.length === 4);
    if (!valid) fail('UNKNOWN_COMMAND');
    if (values.provider && !Object.hasOwn(lists, values.provider) && values.provider !== 'elevenlabs') fail('UNKNOWN_PROVIDER');
    if (values.label && !(mutating && ['chat.model', 'speech.voice'].includes(key))) fail('UNEXPECTED_LABEL');
    if (values.provider && !(command === 'models' || (mutating && key === 'chat.model'))) fail('UNEXPECTED_PROVIDER');
    if (mutating && !values['env-file']) fail('ENV_FILE_REQUIRED');
    const path = values['env-file'] ? resolve(context.cwd ?? process.cwd(), values['env-file']) : undefined;
    const raw = path ? await snapshot(path, mutating) : '';
    const fileEnv = parsed(raw);
    const env = { ...(context.env ?? process.env), ...fileEnv };

    if (mutating) {
      // Validate the target file independently of shell env: the file must be
      // internally consistent when the app loads it in a fresh process.
      const updates = {};
      if (key === 'chat.model') {
        const provider = values.provider ?? fileEnv.STUDIO_DEFAULT_CHAT_PROVIDER;
        if (!Object.hasOwn(lists, provider ?? '')) fail('CHAT_PROVIDER_REQUIRED');
        const id = modelId(value);
        let models; try { models = JSON.parse(fileEnv[lists[provider]] ?? '[]'); } catch { fail('INVALID_CONFIG'); }
        if (!Array.isArray(models)) fail('INVALID_CONFIG');
        const existing = models.find(item => item?.id === id);
        if (existing) { if (values.label) existing.label = label(values.label, id); }
        else models.push({ id, label: label(values.label, id) });
        updates[lists[provider]] = JSON.stringify(models);
        updates.STUDIO_DEFAULT_CHAT_PROVIDER = provider;
        updates.STUDIO_DEFAULT_CHAT_MODEL = id;
      } else if (key === 'mode') {
        if (!['demo', 'self-hosted', 'saas'].includes(value)) fail('INVALID_MODE');
        updates.STUDIO_MODE = value;
      } else if (key === 'speech.voice') {
        updates.STUDIO_SPEECH_VOICE_ID = modelId(value);
        updates.STUDIO_SPEECH_VOICE_LABEL = label(values.label, value);
      } else fail('UNKNOWN_CONFIG_KEY');
      validate({ ...fileEnv, ...updates });
      const next = patchMetadata(raw, updates);
      await writeMetadata(path, raw, next);
      output({ ok: true, changed: key, appliedTo: 'env-file', desktopSessionChanged: false });
      return 0;
    }
    const catalog = validate(env);
    if (command === 'doctor') {
      const tools = await (context.checkTools ?? checkTools)();
      output({ ok: tools.ready, checks: tools.checks, providers: catalog.providers, inferenceVerified: false, apiCalls: 0, desktopSessionChanged: false });
      return tools.ready ? 0 : 1;
    }
    if (command === 'providers') output({ providers: catalog.providers, inferenceVerified: false });
    else if (command === 'models') output({ source: 'local-config', models: [...catalog.models, ...catalog.speechModels].filter(item => !values.provider || item.provider === values.provider), inferenceVerified: false });
    else output({ ...catalog, scope: 'backend-env-catalog', desktopSessionChanged: false });
    return 0;
  } catch (error) {
    // Never echo a provider response, raw dotenv parse error or caller's input.
    const code = error instanceof CliError ? error.message : error.code === 'EACCES' ? 'ACCESS_DENIED' : error.code === 'ENOENT' ? 'PARENT_DIRECTORY_MISSING' : error.code?.startsWith('ERR_PARSE_ARGS') ? 'INVALID_ARGUMENTS' : 'CLI_FAILED';
    const help = {
      ENV_FILE_REQUIRED: 'Specify --env-file PATH. The CLI never chooses a credentials file automatically.',
      INVALID_CONFIG: 'Check model lists and default provider/model consistency. The original file was preserved.',
      CONFIG_BUSY: 'Another CLI may be editing this file. Retry after it finishes; inspect stale locks manually.',
      CHAT_PROVIDER_REQUIRED: 'Set --provider openai, openrouter or meta.',
    }[code] ?? 'Run with --help. No upstream API was called.';
    err(JSON.stringify({ ok: false, code, help }));
    return 2;
  }
}
