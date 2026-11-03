// API IDs checked against official OpenAI model documentation, 2026-11-03.
export const openaiChatModels = [
  {id:'gpt-6-luna',label:'GPT-6 Luna'},
  {id:'gpt-6.1-sol',label:'GPT-6.1 Sol'},
  {id:'gpt-6.1-terra',label:'GPT-6.1 Terra'},
  {id:'gpt-6-astra',label:'GPT-6 Astra'},
  {id:'gpt-6-sol',label:'GPT-6 Sol'},
] as const;
export const metaChatModels=[{id:'muse-spark-1.3-contributor',label:'Muse Spark 1.3 Contributor'},{id:'muse-spark-1.3',label:'Muse Spark 1.3'},{id:'muse-wonder-1.0',label:'Muse Wonder 1.0'}] as const;
export type ProviderConnection={provider:'openai'|'openrouter'|'meta'|'elevenlabs';apiKey:string;modelId?:string;modelLabel?:string};
export type NativeModel = {id:string;label:string;enabled:boolean};
export type NativeProvider = {id:string;name:string;configured:boolean;models:NativeModel[]};
export type ReasoningEffort='auto'|'low'|'medium'|'high';
export type NativeCatalog = {reasoning?:ReasoningEffort;providers:NativeProvider[];defaultProvider:string;defaultModel:string;voiceConfigured:boolean};
export type NativeSelection = {provider:string;model:string};
