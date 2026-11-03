import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/ui',
  fullyParallel:false,
  workers:1,
  use:{baseURL:'http://127.0.0.1:3210',viewport:{width:1440,height:900},channel:process.env.PLAYWRIGHT_CHANNEL || undefined},
  webServer:{command:'npm start -- --hostname 127.0.0.1 --port 3210',url:'http://127.0.0.1:3210/api/health',reuseExistingServer:false,env:{STUDIO_MODE:'demo',STUDIO_CHAT_MODELS:'[]',STUDIO_OPENAI_MODELS:'[]',STUDIO_META_MODELS:'[]',STUDIO_SPEECH_MODELS:'[]',STUDIO_DEFAULT_CHAT_PROVIDER:'',STUDIO_DEFAULT_CHAT_MODEL:'',STUDIO_SPEECH_VOICE_ID:'',STUDIO_SPEECH_VOICE_LABEL:'',OPENAI_API_KEY:'',OPENROUTER_API_KEY:'',META_API_KEY:'',ELEVENLABS_API_KEY:''}},
});
