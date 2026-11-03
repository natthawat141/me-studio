"""Explicit provider adapters. No environment discovery, retries or tracing setup."""
import httpx
from langchain_openai import ChatOpenAI

ENDPOINTS={'openai':'https://api.openai.com/v1','openrouter':'https://openrouter.ai/api/v1','meta':'https://api.meta.ai/v1'}

def create_chat_model(config, http_client=None):
    provider=config.get('provider','openai')
    if provider not in ENDPOINTS: raise ValueError('INVALID_PROVIDER')
    reasoning=config.get('reasoning','auto')
    if reasoning not in ('auto','low','medium','high'): raise ValueError('INVALID_REASONING')
    # Meta's adapter has no verified OpenAI effort contract. Do not invent one.
    if provider=='meta' and reasoning!='auto': raise ValueError('REASONING_NOT_SUPPORTED')
    kwargs=dict(model=config.get('model','gpt-6-luna'),api_key=config['apiKey'],base_url=ENDPOINTS[provider],
        use_responses_api=True,store=False,include=['reasoning.encrypted_content'],
        max_retries=0,timeout=90,streaming=True,stream_usage=True,model_kwargs={"parallel_tool_calls":False},
        max_tokens=config.get('limits',{}).get('maxOutputTokens',2048),
        http_async_client=http_client or httpx.AsyncClient(trust_env=False),
        http_client=httpx.Client(trust_env=False))
    if reasoning!='auto': kwargs['reasoning']={'effort':reasoning}
    return ChatOpenAI(**kwargs)

class OpenAIProvider:
    def __init__(self,api_key,model='gpt-6-luna',provider='openai',reasoning='auto',limits=None):
        self.chat_model=create_chat_model({'apiKey':api_key,'model':model,'provider':provider,'reasoning':reasoning,'limits':limits or {}})
    async def close(self):
        await self.chat_model.http_async_client.aclose()
        self.chat_model.http_client.close()
