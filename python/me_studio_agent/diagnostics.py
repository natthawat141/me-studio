"""Explicit offline packaging diagnostic; never reads user data or calls a provider."""
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessageChunk,ToolMessage
from langchain_core.outputs import ChatGenerationChunk
from runtime import run_agent
class DiagnosticModel(BaseChatModel):
    step:int=0
    @property
    def _llm_type(self):return 'studio-packaging-check'
    def bind_tools(self,tools,**kwargs):return self
    def _generate(self,messages,stop=None,run_manager=None,**kwargs):raise AssertionError('Async only')
    async def _astream(self,messages,stop=None,run_manager=None,**kwargs):
        self.step+=1
        if self.step==1:yield ChatGenerationChunk(message=AIMessageChunk(content='',tool_calls=[{'id':'diagnostic-1','name':'inspect','args':{}}]))
        else:
            tool=next(m for m in messages if isinstance(m,ToolMessage))
            if tool.content[1]['image_url']['url']!='data:image/png;base64,aGVsbG8=':raise AssertionError('Missing image')
            yield ChatGenerationChunk(message=AIMessageChunk(content='offline-ok'))
async def check_graph():
    config={'model':'diagnostic','provider':'openai','text':'offline diagnostic','history':[],'tools':[{'name':'inspect','description':'Offline inspection fixture','parameters':{'type':'object','properties':{}}}],'limits':{'maxModelCalls':3,'maxToolCalls':3,'maxContextChars':128000,'maxOutputTokens':128,'timeoutMs':10000}}
    async def rpc(method,value):return 'Offline context' if method=='context' else {'content':[{'type':'text','text':'offline fixture'},{'type':'image','mimeType':'image/png','data':'aGVsbG8='}]}
    async def emit(event):pass
    result=await run_agent(config,DiagnosticModel(),rpc,emit)
    if result.get('result')!='offline-ok' or result['usage']['toolCalls']!=1:raise RuntimeError('SDK_DIAGNOSTIC_FAILED')
