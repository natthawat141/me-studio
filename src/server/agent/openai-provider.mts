import { streamSimple } from '@earendil-works/pi-ai/api/openai-responses';
import type { Model } from '@earendil-works/pi-ai';
import type { StreamFn } from '@earendil-works/pi-agent-core';
export function createOpenAIProvider(apiKey:string){
 if(!apiKey.trim())throw Error('OPENAI_KEY_REQUIRED');
 const model:Model<'openai-responses'>={id:'gpt-6-luna',name:'GPT-6 Luna',api:'openai-responses',provider:'openai',baseUrl:'https://api.openai.com/v1',reasoning:true,input:['text'],contextWindow:128000,maxTokens:8192,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}};
 const stream:StreamFn=(_model,context,settings)=>streamSimple(model,context,{...settings,apiKey,reasoning:'low',maxRetries:0});
 return {model,stream};
}
