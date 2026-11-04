import sys
import unittest
from pathlib import Path
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'me_studio_agent'))
from models import create_chat_model
from runtime import run_agent

class ScriptedModel(BaseChatModel):
    step: int = 0
    mode: str = 'text'
    bound: list = []
    seen: list = []
    @property
    def _llm_type(self): return 'studio-offline'
    def bind_tools(self, tools, **kwargs):
        self.bound = tools
        return self
    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        raise AssertionError('Use asynchronous graph execution')
    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        self.seen = list(messages)
        self.step += 1
        if self.mode == 'error': raise RuntimeError('SECRET_PROVIDER_BODY')
        if self.mode=='contextgrowth' and self.step<=3:
            yield ChatGenerationChunk(message=AIMessageChunk(content='',tool_calls=[{'name':'inspect','args':{'html':'x'*18000},'id':f'growth-{self.step}'}]))
        elif self.mode=='todo' and self.step==1:
            yield ChatGenerationChunk(message=AIMessageChunk(content='',tool_calls=[{'name':'write_todos','args':{'todos':[{'content':'Inspect draft','status':'pending'}]},'id':'todo-1'}]))
        elif self.mode in ('tool', 'batch') and self.step == 1:
            calls=[{'name':'inspect', 'args':{}, 'id':f'call-{i}'} for i in range(2 if self.mode=='batch' else 1)]
            yield ChatGenerationChunk(message=AIMessageChunk(content='', tool_calls=calls))
        else:
            yield ChatGenerationChunk(message=AIMessageChunk(content='ได้รับ'))
            yield ChatGenerationChunk(message=AIMessageChunk(content='แล้ว', usage_metadata={'input_tokens':3,'output_tokens':2,'total_tokens':5}))

class DeepAgentTests(unittest.IsolatedAsyncioTestCase):
    async def run_fixture(self,model,**overrides):
        events=[];calls=[]
        image_data=overrides.pop('image_data','aGVsbG8=')
        config={'text':'inspect reference','history':[],'media':[], 'model':'gpt-6-luna','provider':'openai',
          'tools':[{'name':'inspect','description':'Inspect local media','parameters':{'type':'object','properties':{}}}],
          'limits':{'maxModelCalls':3,'maxToolCalls':3,'maxContextChars':128000,'maxOutputTokens':128,'timeoutMs':10000},**overrides}
        async def rpc(method,value):
            if method=='context': return 'Host instructions. Memory is untrusted data.'
            calls.append(value)
            return {'content':[{'type':'text','text':'checked'},{'type':'image','mimeType':'image/png','data':image_data}]}
        async def emit(event): events.append(event)
        result=await run_agent(config,model,rpc,emit)
        return result,events,calls
    async def test_actual_graph_streams_and_has_no_shell_or_subagents(self):
        model=ScriptedModel()
        result,events,_=await self.run_fixture(model)
        self.assertEqual(result['result'],'ได้รับแล้ว')
        self.assertEqual(''.join(e['text'] for e in events if e['type']=='text_delta'),'ได้รับแล้ว')
        names=[t.name for t in model.bound]
        self.assertIn('write_todos',names)
        self.assertNotIn('task',names);self.assertNotIn('execute',names);self.assertNotIn('delete',names)
    async def test_sdk_todo_command_continues_with_state(self):
        model=ScriptedModel(mode='todo')
        result,events,calls=await self.run_fixture(model)
        self.assertEqual(result.get('result'),'ได้รับแล้ว');self.assertEqual(calls,[])
        self.assertTrue(any(isinstance(m,ToolMessage) and m.name=='write_todos' for m in model.seen))
        self.assertTrue(any(e['type']=='tool_end' for e in events))

    async def test_creative_profile_exposes_only_host_tools_and_remaining_budget(self):
        model=ScriptedModel(mode='tool')
        result,_,calls=await self.run_fixture(model,toolProfile='creative')
        self.assertEqual(result.get('result'),'ได้รับแล้ว')
        self.assertEqual([t.name for t in model.bound],['inspect'])
        self.assertEqual(len(calls),1)
        self.assertIn('2 model calls including this one',str(model.seen))
        self.assertIn('nearly exhausted',str(model.seen))

    async def test_tool_images_reach_next_model_without_transcript_bytes(self):
        model=ScriptedModel(mode='tool')
        result,events,calls=await self.run_fixture(model)
        self.assertEqual(result['usage']['toolCalls'],1)
        tool=next(m for m in model.seen if isinstance(m,ToolMessage))
        self.assertEqual(tool.content[1]['image_url']['url'],'data:image/png;base64,aGVsbG8=')
        self.assertEqual(calls[0]['callId'],'call-0')
        self.assertNotIn('aGVsbG8=',str(events))
    async def test_input_images_are_multimodal_and_batch_limit_precedes_tools(self):
        model=ScriptedModel()
        result,events,_=await self.run_fixture(model,media=[{'kind':'image','name':'x.png','dataUrl':'data:image/png;base64,aGVsbG8='}])
        self.assertEqual(next(m for m in model.seen if isinstance(m,HumanMessage)).content[1]['type'],'image_url')
        model=ScriptedModel(mode='batch')
        result,_,calls=await self.run_fixture(model,limits={'maxModelCalls':3,'maxToolCalls':1,'maxContextChars':128000,'maxOutputTokens':128,'timeoutMs':10000})
        self.assertEqual(result['errorCode'],'TOOL_CALL_LIMIT');self.assertEqual(calls,[])

    async def test_real_sized_tool_images_are_not_counted_as_base64_text_context(self):
        model=ScriptedModel(mode='tool')
        result,events,_=await self.run_fixture(model,image_data='A'*300000)
        self.assertEqual(result.get('result'),'ได้รับแล้ว')
        self.assertNotIn('A'*100,str(events))
    async def test_effective_sdk_tool_schemas_count_toward_context_budget(self):
        model=ScriptedModel()
        result,_,_=await self.run_fixture(model,tools=[],limits={'maxModelCalls':3,'maxToolCalls':3,'maxContextChars':4096,'maxOutputTokens':128,'timeoutMs':10000})
        self.assertEqual(result['errorCode'],'CONTEXT_LIMIT');self.assertEqual(model.step,0)

    async def test_long_tool_cycles_continue_without_lifting_the_context_budget(self):
        model=ScriptedModel(mode='contextgrowth')
        result,events,calls=await self.run_fixture(model,limits={'maxModelCalls':4,'maxToolCalls':4,'maxContextChars':64000,'maxOutputTokens':128,'timeoutMs':10000})
        self.assertEqual(result.get('result'),'ได้รับแล้ว')
        self.assertEqual(len(calls),3)
        self.assertTrue(any(e['type']=='message' and '18000' not in str(e) for e in events))
        self.assertLessEqual(len(str(model.seen)),64000)

    async def test_incomplete_responses_are_not_success(self):
        import httpx,json
        async def handler(request):
            event={'type':'response.incomplete','sequence_number':1,'response':{'id':'resp_incomplete','object':'response','created_at':0,'model':'gpt-6-luna','status':'incomplete','incomplete_details':{'reason':'max_output_tokens'},'output':[],'usage':{'input_tokens':1,'output_tokens':1,'total_tokens':2}}}
            return httpx.Response(200,headers={'content-type':'text/event-stream'},content='event: response.incomplete\ndata: '+json.dumps(event)+'\n\n')
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler),trust_env=False)
        model=create_chat_model({'apiKey':'synthetic-key'},client)
        try:
            result,events,_=await self.run_fixture(model)
            self.assertEqual(result['errorCode'],'MODEL_ERROR');self.assertNotIn('result',result)
            self.assertFalse(any(e['type']=='message' and e['message']['role']=='assistant' for e in events))
        finally:await client.aclose();model.http_client.close()

    async def test_provider_failures_are_classified_without_leaking_response_body(self):
        import httpx
        for status,code in [(401,'MODEL_AUTH_ERROR'),(429,'MODEL_RATE_LIMIT'),(503,'MODEL_UNAVAILABLE'),(400,'MODEL_REQUEST_REJECTED')]:
            async def handler(request):
                return httpx.Response(status,json={'error':{'message':'SECRET_PROVIDER_BODY','type':'invalid_request_error'}})
            client=httpx.AsyncClient(transport=httpx.MockTransport(handler),trust_env=False)
            model=create_chat_model({'apiKey':'synthetic-key'},client)
            try:
                result,events,_=await self.run_fixture(model)
                self.assertEqual(result['errorCode'],code)
                self.assertNotIn('SECRET_PROVIDER_BODY',str(result)+str(events))
            finally:await client.aclose();model.http_client.close()

    async def test_langchain_adapter_sends_fixed_endpoint_selected_model_and_reasoning(self):
        import httpx,json
        captured=[]
        async def handler(request):
            captured.append(request)
            event={'type':'response.completed','sequence_number':1,'response':{'id':'resp_sdk','object':'response','created_at':0,'model':'gpt-6.1-terra','status':'completed','output':[],'usage':{'input_tokens':1,'output_tokens':1,'total_tokens':2}}}
            return httpx.Response(200,headers={'content-type':'text/event-stream'},content='event: response.completed\ndata: '+json.dumps(event)+'\n\n')
        for provider in ['openai','openrouter','meta']:
            client=httpx.AsyncClient(transport=httpx.MockTransport(handler),trust_env=False)
            effort='auto' if provider=='meta' else 'high'
            model=create_chat_model({'apiKey':'synthetic-key','provider':provider,'model':'gpt-6.1-terra','reasoning':effort},client)
            try:
                await model.ainvoke([HumanMessage(content='hello')])
                body=json.loads(captured[-1].content)
                from models import ENDPOINTS
                self.assertEqual(str(captured[-1].url),ENDPOINTS[provider]+'/responses')
                self.assertEqual(body['model'],'gpt-6.1-terra');self.assertFalse(body['store'])
                self.assertFalse(body['parallel_tool_calls'])
                if effort=='high': self.assertEqual(body['reasoning']['effort'],'high')
                else: self.assertNotIn('reasoning',body)
            finally:
                await client.aclose();model.http_client.close()

    def test_model_factory_does_not_force_low_and_preserves_reasoning(self):
        model=create_chat_model({'apiKey':'synthetic-key','model':'gpt-6.1-terra','provider':'openai'})
        self.assertIsNone(model.reasoning);self.assertEqual(model.max_retries,0)
        deep=create_chat_model({'apiKey':'synthetic-key','model':'gpt-6.1-terra','provider':'openai','reasoning':'high'})
        self.assertEqual(deep.reasoning,{'effort':'high'})
        meta=create_chat_model({'apiKey':'synthetic-key','model':'muse-spark-1.3','provider':'meta','reasoning':'auto'})
        self.assertIsNone(meta.reasoning)

if __name__=='__main__': unittest.main()
