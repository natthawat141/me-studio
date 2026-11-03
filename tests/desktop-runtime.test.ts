import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DesktopProjects } from '../desktop/projects.mjs';
import { trustedSender, runtimeEnvironment } from '../desktop/policy.mjs';

test('desktop bridge accepts only its owned main frame and strips developer credentials', () => {
  assert.equal(trustedSender('http://127.0.0.1:18147/', true), true);
  for (const url of ['https://example.org/', 'http://127.0.0.1:3080/', 'file:///tmp/test.html']) assert.equal(trustedSender(url, true), false);
  assert.equal(trustedSender('http://127.0.0.1:18147/', false), false);
  const env = runtimeEnvironment({ NODE_ENV: 'test', HOME: '/tmp/home', META_API_KEY: 'synthetic-secret', NODE_OPTIONS: '--inspect', PATH: '/custom' });
  assert.equal(env.META_API_KEY, undefined); assert.equal(env.NODE_OPTIONS, undefined); assert.equal(env.HOME, '/tmp/home');
});

test('desktop projects persist revisions, escape dialogue, and reject stale edits/path IDs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'me-studio-desktop-'));
  try {
    const projects = new DesktopProjects(root);
    const project = await projects.create('คลิปของฉัน');
    const updated = await projects.update(project.id, 0, { greeting: '</script><script>alert(1)</script>', reply: 'สวัสดี' });
    assert.equal(updated.revision, 1);
    assert.equal((await new DesktopProjects(root).get(project.id)).scene.reply, 'สวัสดี');
    await assert.rejects(projects.update(project.id, 0, { reply: 'stale' }), /REVISION_CONFLICT/);
    await assert.rejects(projects.get('../../private'), /INVALID_PROJECT/);
    const manifest = await projects.snapshot(project.id, 1);
    const html = await readFile(join(manifest.directory, 'scene.html'), 'utf8');
    assert.ok(!html.includes('</script><script>alert(1)</script>'));
    assert.ok(html.includes('window.seek'));
    assert.ok((await readFile(manifest.path, 'utf8')).includes('1080'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
