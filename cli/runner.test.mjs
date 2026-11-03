import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseEnv } from 'node:util';
import { run } from './runner.mjs';

async function invoke(args, options = {}) {
  const stdout = [], stderr = [];
  const code = await run(args, { env: {}, stdout: value => stdout.push(value), stderr: value => stderr.push(value), ...options });
  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'me-studio-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, file: join(root, 'test.env') };
}

test('model selection uses shared validation, preserves unrelated bytes and credentials', async t => {
  const { file } = await fixture(t);
  const untouched = '# keep comment\r\nOPENAI_API_KEY=synthetic-secret\r\nOTHER="multi\nSTUDIO_DEFAULT_CHAT_MODEL=inside-quoted-value\nline"\r\n';
  await writeFile(file, untouched + 'STUDIO_OPENAI_MODELS=[]\r\n');
  const result = await invoke(['config', 'set', 'chat.model', 'synthetic-model', '--provider', 'openai', '--label', 'My model', '--env-file', file, '--json']);
  assert.equal(result.code, 0, result.stderr);
  const raw = await readFile(file, 'utf8');
  assert.ok(raw.startsWith(untouched));
  const env = parseEnv(raw);
  assert.equal(env.STUDIO_DEFAULT_CHAT_MODEL, 'synthetic-model');
  assert.deepEqual(JSON.parse(env.STUDIO_OPENAI_MODELS), [{ id: 'synthetic-model', label: 'My model' }]);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await invoke(['config', 'show', '--env-file', file])).stdout.includes('synthetic-secret'), false);
  assert.equal(result.stdout.includes('synthetic-secret'), false);
});

test('model list is local and does not claim a live catalog or authentication', async t => {
  const { file } = await fixture(t);
  await writeFile(file, `OPENAI_API_KEY=synthetic-secret\nSTUDIO_OPENAI_MODELS='[{"id":"test-model","label":"Test"}]'\n`);
  const result = await invoke(['models', 'list', '--provider', 'openai', '--env-file', file, '--json']);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { source: 'local-config', models: [{ provider: 'openai', modelId: 'test-model', label: 'Test' }], inferenceVerified: false });
  const providers = JSON.parse((await invoke(['providers', 'list', '--env-file', file])).stdout);
  assert.equal(providers.providers.find(p => p.id === 'openai').credentialConfigured, true);
  assert.equal(JSON.stringify(providers).includes('synthetic-secret'), false);
});

test('reselecting a model does not duplicate it and can update its label', async t => {
  const { file } = await fixture(t);
  const args = ['config', 'set', 'chat.model', 'test-model', '--provider', 'openai', '--env-file', file];
  assert.equal((await invoke(args)).code, 0);
  assert.equal((await invoke([...args, '--label', 'Renamed'])).code, 0);
  const env = parseEnv(await readFile(file, 'utf8'));
  assert.deepEqual(JSON.parse(env.STUDIO_OPENAI_MODELS), [{ id: 'test-model', label: 'Renamed' }]);
});

test('invalid existing config and unknown or secret keys preserve the original file', async t => {
  const { file } = await fixture(t);
  const raw = 'STUDIO_OPENAI_MODELS=not-json\nOPENAI_API_KEY=synthetic-secret\n';
  await writeFile(file, raw);
  for (const args of [
    ['config', 'set', 'mode', 'demo'],
    ['config', 'set', 'api.key', 'synthetic-secret'],
    ['config', 'set', 'chat.model', 'test-model', '--provider', 'unknown'],
  ]) {
    const result = await invoke([...args, '--env-file', file]);
    assert.equal(result.code, 2);
    assert.equal(result.stderr.includes('synthetic-secret'), false);
    assert.equal(await readFile(file, 'utf8'), raw);
  }
});

test('writes require explicit file, reject symlinks and respect another CLI lock', async t => {
  const { file, root } = await fixture(t);
  await writeFile(file, 'STUDIO_MODE=demo\n');
  assert.equal((await invoke(['config', 'set', 'mode', 'self-hosted'])).code, 2);
  const link = join(root, 'link.env'); await symlink(file, link);
  const symlinkResult = await invoke(['config', 'set', 'mode', 'self-hosted', '--env-file', link]);
  assert.equal(JSON.parse(symlinkResult.stderr).code, 'UNSAFE_ENV_FILE');
  await writeFile(file + '.me-studio-lock', 'other CLI');
  const locked = await invoke(['config', 'set', 'mode', 'self-hosted', '--env-file', file]);
  assert.equal(JSON.parse(locked.stderr).code, 'CONFIG_BUSY');
  assert.equal(await readFile(file, 'utf8'), 'STUDIO_MODE=demo\n');
  assert.equal(await readFile(file + '.me-studio-lock', 'utf8'), 'other CLI');
});

test('doctor reports tools independently of provider inference and uses meaningful exit codes', async () => {
  for (const ready of [true, false]) {
    const result = await invoke(['doctor', '--json'], { checkTools: async () => ({ ready, checks: [{ name: 'FFmpeg', ready }] }) });
    assert.equal(result.code, ready ? 0 : 1);
    assert.equal(JSON.parse(result.stdout).apiCalls, 0);
    assert.equal(JSON.parse(result.stdout).inferenceVerified, false);
  }
  assert.equal((await invoke(['doctor', '--typo'])).code, 2);
  assert.equal((await invoke(['models', 'list', 'extra'])).code, 2);
});

test('voice setting and JSON labels survive dotenv serialization without touching keys', async t => {
  const { file } = await fixture(t);
  await writeFile(file, 'ELEVENLABS_API_KEY=synthetic-secret\n');
  const result = await invoke(['config', 'set', 'speech.voice', 'test-voice', '--label', `Bew's "voice"`, '--env-file', file]);
  assert.equal(result.code, 0, result.stderr);
  const env = parseEnv(await readFile(file, 'utf8'));
  assert.equal(env.STUDIO_SPEECH_VOICE_LABEL, `Bew's "voice"`);
  assert.equal(env.ELEVENLABS_API_KEY, 'synthetic-secret');
});

test('explicit missing config is an error on reads; writes can initialize the requested file', async t => {
  const { file } = await fixture(t);
  const result = await invoke(['config', 'show', '--env-file', file]);
  assert.equal(result.code, 2);
  assert.equal(JSON.parse(result.stderr).code, 'ENV_FILE_NOT_FOUND');
  assert.equal((await invoke(['config', 'set', 'mode', 'demo', '--env-file', file])).code, 0);
  assert.equal(parseEnv(await readFile(file, 'utf8')).STUDIO_MODE, 'demo');
});
