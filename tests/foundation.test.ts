import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '../src/lib/provider-config';
import { readWorkspace, saveWorkspace } from '../src/lib/local-store';
import { requestAssistant } from '../src/lib/assistant';

function storage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }});
  return values;
}
const initial = () => ({projects:[{id:'p',title:'Original',messages:[],updatedAt:0}],selectedId:'p',settings:{autoPlay:false,muted:false},previewWidth:53});

test('catalog projects only safe metadata and separates Llama family from provider', () => {
  const catalog = buildCatalog({ STUDIO_MODE:'self-hosted', OPENROUTER_API_KEY:'secret-test-only', ELEVENLABS_API_KEY:'other-secret-test-only', STUDIO_CHAT_MODELS: JSON.stringify([{id:'meta-llama/operator-selected-id',label:'Llama',family:'meta-llama'}]) });
  assert.equal(catalog.providers[0].id,'openrouter');
  assert.equal(catalog.models[0].provider,'openrouter');
  assert.equal(catalog.models[0].family,'meta-llama');
  assert.equal(catalog.providers[0].credentialConfigured,true);
  assert.equal(catalog.liveChatEnabled,false);
  assert.doesNotMatch(JSON.stringify(catalog), /secret-test-only|API_KEY/);
});
test('demo defaults do not invent models or pretend a connection', () => {
  const catalog = buildCatalog({});
  assert.equal(catalog.mode,'demo');
  assert.deepEqual(catalog.models,[]);
  assert.equal(catalog.providers[0].credentialConfigured,false);
});
test('malformed config, unknown fields, duplicate IDs and empty model IDs fail closed', () => {
  for (const STUDIO_CHAT_MODELS of ['{', '[{"id":""}]', '[{"id":"x","label":"X","url":"https://arbitrary"}]', '[{"id":"x","label":"X"},{"id":"x","label":"Y"}]']) {
    assert.throws(() => buildCatalog({STUDIO_CHAT_MODELS}));
  }
  assert.throws(() => buildCatalog({STUDIO_MODE:'public-unprotected'}));
});
test('legacy workspace is preserved and stale snapshots cannot silently overwrite', () => {
  storage(); saveWorkspace(initial());
  const a = readWorkspace()!; const b = readWorkspace()!;
  a.projects[0].title='Changed'; saveWorkspace(a);
  b.settings.muted=true;
  assert.throws(() => saveWorkspace(b), /เปลี่ยนแปลง/);
  assert.equal(readWorkspace()!.projects[0].title,'Changed');
});
test('corrupt workspace must not be replaced by defaults', () => {
  const values=storage(); values.set('me-studio.workspace.v1','broken');
  assert.throws(() => saveWorkspace(initial()));
  assert.equal(values.get('me-studio.workspace.v1'),'broken');
});
test('asset references and legacy filenames survive storage', () => {
  storage();
  const data={...initial(), projects:[{...initial().projects[0], messages:[{id:'m',role:'user' as const,text:'brief',files:['same.png'],attachmentIds:['asset-1']}]}]};
  saveWorkspace(data);
  assert.deepEqual(readWorkspace()!.projects[0].messages[0].attachmentIds,['asset-1']);
  assert.deepEqual(readWorkspace()!.projects[0].messages[0].files,['same.png']);
});
test('mock adapter accepts structured input, rejects invalid input and pre-aborted requests', async () => {
  const signal=AbortSignal.abort();
  await assert.rejects(requestAssistant({projectId:'p',message:'brief',attachmentIds:['asset-1'],model:{provider:'openrouter',modelId:'meta-llama/operator-id'}},signal), {name:'AbortError'});
  await assert.rejects(requestAssistant({projectId:'',message:'',attachmentIds:[],model:null},new AbortController().signal));
});

test('drafts are isolated by project and copy attachment arrays', async () => {
  const { DraftStore } = await import('../src/lib/draft-store');
  const drafts=new DraftStore();
  const ids=['asset-1']; drafts.save('a',{text:'unfinished',attachmentIds:ids});
  ids.push('external-mutation');
  drafts.save('b',{text:'other',attachmentIds:[]});
  assert.deepEqual(drafts.read('a'),{text:'unfinished',attachmentIds:['asset-1']});
  assert.equal(drafts.read('b').text,'other');
  assert.equal(drafts.read('new').text,'');
});

test('legacy revision-less records load without rewriting their content', () => {
  const values=storage();
  const legacy=JSON.stringify(initial());
  values.set('me-studio.workspace.v1',legacy);
  const loaded=readWorkspace()!;
  assert.equal(loaded.revision,0);
  assert.equal(values.get('me-studio.workspace.v1'),legacy);
  saveWorkspace(loaded);
  assert.equal(readWorkspace()!.revision,1);
});
test('valid structured mock request returns a labelled mock answer', async () => {
  const answer=await requestAssistant({projectId:'p',message:'draw a cat',attachmentIds:['asset-1'],model:{provider:'openrouter',modelId:'operator-id'}},new AbortController().signal);
  assert.match(answer,/draw a cat/);
  assert.match(answer,/ยังไม่ได้เชื่อม AI/);
});

test('Meta direct models and credentials are distinct from OpenRouter routes', () => {
  const catalog=buildCatalog({META_API_KEY:'meta-synthetic-secret',STUDIO_META_MODELS:JSON.stringify([{id:'muse-wonder-1.0',label:'Muse Wonder'}])});
  assert.equal(catalog.models[0].provider,'meta');
  assert.equal(catalog.models[0].modelId,'muse-wonder-1.0');
  assert.equal(catalog.providers.find((provider)=>provider.id==='meta')?.credentialConfigured,true);
  assert.equal(catalog.providers.find((provider)=>provider.id==='openrouter')?.credentialConfigured,false);
  assert.doesNotMatch(JSON.stringify(catalog),/meta-synthetic-secret/);
});
test('model selection includes provider identity', async () => {
  const { chatModelKey }=await import('../src/lib/chat-models');
  assert.notEqual(chatModelKey({provider:'meta',modelId:'same'}),chatModelKey({provider:'openrouter',modelId:'same'}));
});

test('Agent settings default safely for legacy projects and reject invalid output counts',async()=>{
  const { getAgentSettings,agentSettingsSchema }=await import('../src/lib/agent-settings');
  assert.equal(getAgentSettings().confirmation,'always');
  const a=getAgentSettings(),b=getAgentSettings();
  a.video.count=3;assert.equal(b.video.count,1);
  assert.equal(agentSettingsSchema.safeParse({...b,video:{aspectRatio:'16:9',count:20}}).success,false);
  assert.equal(agentSettingsSchema.safeParse({...b,confirmation:'never-charge-unlimited'}).success,false);
});
test('project Agent settings persist without changing another project or overwriting stale data',async()=>{
  const { getAgentSettings }=await import('../src/lib/agent-settings');
  const { persistProjectAgentSettings }=await import('../src/services/project-agent-settings');
  storage();const data={...initial(),projects:[initial().projects[0],{...initial().projects[0],id:'other'}]};saveWorkspace(data);
  const first=readWorkspace()!;const stale=readWorkspace()!;
  const settings=getAgentSettings();settings.video.aspectRatio='9:16';
  persistProjectAgentSettings(first,'p',settings);
  assert.equal(readWorkspace()!.projects[0].agentSettings?.video.aspectRatio,'9:16');
  assert.equal(readWorkspace()!.projects[1].agentSettings,undefined);
  assert.throws(()=>persistProjectAgentSettings(stale,'other',settings));
  assert.equal(readWorkspace()!.projects[1].agentSettings,undefined);
});

test('chat turns preserve an independent Agent settings snapshot',async()=>{
  const { getAgentSettings }=await import('../src/lib/agent-settings');
  const { chatTurnRequestSchema }=await import('../src/lib/api-contract');
  const settings=getAgentSettings();
  const turn=chatTurnRequestSchema.parse({projectId:'p',message:'brief',attachmentIds:[],model:null,agentSettings:settings});
  settings.video.count=4;
  assert.equal(turn.agentSettings?.video.count,1);
});
