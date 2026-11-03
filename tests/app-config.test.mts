import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AppConfig,parseAppConfig} from '../desktop/app-config.mjs';
test('native config seeds actual GPT IDs, persists visibility and never returns secrets in catalog',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-config-'));try{
  const config=new AppConfig(join(root,'config.env'));await config.ensure();
  await config.import('Openai_api=synthetic-local-key\nelevenlabs=synthetic-voice-key\nUNRELATED_SECRET=not-imported');
  let data=await config.read();assert.equal(data.catalog.providers.find(p=>p.id==='openai')!.configured,true);assert.equal(data.catalog.voiceConfigured,true);
  assert.ok(data.catalog.providers.find(p=>p.id==='openai')!.models.some(m=>m.id==='gpt-6.1-sol'));
  assert.ok(!JSON.stringify(data.catalog).includes('synthetic'));assert.ok(!(await readFile(config.path,'utf8')).includes('UNRELATED'));
  await config.toggle('openai','gpt-6.1-sol',false);data=await config.read();assert.equal(data.catalog.providers.find(p=>p.id==='openai')!.models.find(m=>m.id==='gpt-6.1-sol')?.enabled,false);
  assert.equal(data.env.OPENAI_API_KEY,'synthetic-local-key');assert.equal((await stat(config.path)).mode&0o777,0o600);
  await config.saveProvider({provider:'meta',apiKey:'synthetic-meta-key'});const connected=await config.read();assert.equal(connected.catalog.providers.find(p=>p.id==='meta')?.configured,true);assert.ok(!JSON.stringify(connected.catalog).includes('synthetic-meta-key'));assert.equal(connected.env.OPENAI_API_KEY,'synthetic-local-key');
  await assert.rejects(config.saveProvider({provider:'other',apiKey:'synthetic'}));
  await assert.rejects(config.toggle('openai','not-in-config',true));
  assert.throws(()=>parseAppConfig('STUDIO_DEFAULT_CHAT_MODEL=not-in-catalog'));
 }finally{await rm(root,{recursive:true,force:true});}
});
