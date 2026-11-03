"""Deep Agents owns orchestration; private host RPC owns durable state and tools."""
import asyncio
import json
import time
from deepagents import create_deep_agent
from deepagents.backends import StateBackend
from deepagents.middleware.filesystem import FilesystemMiddleware
from langchain.agents.middleware import AgentMiddleware,TodoListMiddleware,wrap_model_call,wrap_tool_call
from langchain_core.messages import AIMessage,AIMessageChunk,HumanMessage,SystemMessage,ToolMessage
from langchain_core.tools import StructuredTool
from models import OpenAIProvider

class AgentFailure(Exception): pass

class NoDelegation(AgentMiddleware):
    @property
    def name(self): return 'SubAgentMiddleware'

class HostContextBudget(AgentMiddleware):
    @property
    def name(self): return 'SummarizationMiddleware'


def json_text(value): return json.dumps(value,ensure_ascii=False,separators=(',',':'))

def history_input(messages):
    result=[]
    for m in messages:
        if m.get('role') not in ('user','assistant'): continue
        content=m.get('content','')
        text=content if isinstance(content,str) else ''.join(p.get('text','') for p in content if isinstance(p,dict) and p.get('type')=='text')
        if text: result.append({'role':m['role'],'content':text})
    return result

def bounded_text(value):
    if isinstance(value,str): return '[bounded image]' if value.startswith('data:image/') else value
    if isinstance(value,list): return [bounded_text(v) for v in value]
    if isinstance(value,dict): return {k:bounded_text(v) for k,v in value.items()}
    return value

def model_content(parts):
    content=[]
    for p in parts:
        if p.get('type')=='text': content.append({'type':'text','text':p['text']})
        elif p.get('type')=='image': content.append({'type':'image_url','image_url':{'url':f"data:{p['mimeType']};base64,{p['data']}"}})
    return content

def transcript_content(parts):
    return [p if p.get('type')=='text' else {'type':'text','text':'[image inspection result]'} for p in parts]

async def run_agent(config,provider,rpc,emit):
    limits=config['limits'];usage={'modelCalls':0,'toolCalls':0,'inputTokens':0,'outputTokens':0};seen=set()
    model=getattr(provider,'chat_model',provider)
    definitions={t['name']:t for t in config['tools']}
    # Host owns rolling history and hard budgets. No hidden paid summarization calls.
    async def unreachable(**kwargs): raise AgentFailure('TOOL_NOT_APPROVED')
    tools=[StructuredTool.from_function(coroutine=unreachable,name=t['name'],description=t['description'],args_schema=t['parameters']) for t in config['tools']]
    async def event_message(role,content,**extra):
        await emit({'type':'message','message':{'role':role,'content':content,'timestamp':int(time.time()*1000),**extra}})
    @wrap_model_call
    async def budget(request,handler):
        if usage['modelCalls']>=limits['maxModelCalls']: raise AgentFailure('MODEL_CALL_LIMIT')
        context=await rpc('context',{})
        base=request.system_message.content if request.system_message else ''
        if not isinstance(base,str): base=json_text(base)
        system=SystemMessage(content=base+'\nTrusted host context:\n'+context)
        size=len(json_text(bounded_text({'system':system.content,'messages':[m.model_dump(mode='json') for m in request.messages],'tools':config['tools']})))
        if size>limits['maxContextChars']: raise AgentFailure('CONTEXT_LIMIT')
        usage['modelCalls']+=1;await emit({'type':'usage','usage':dict(usage)})
        response=await handler(request.override(system_message=system))
        calls=[c for m in response.result if isinstance(m,AIMessage) for c in m.tool_calls]
        if usage['toolCalls']+len(calls)>limits['maxToolCalls']: raise AgentFailure('TOOL_CALL_LIMIT')
        for m in response.result:
            if not isinstance(m,AIMessage): continue
            u=m.usage_metadata or {};usage['inputTokens']+=max(0,u.get('input_tokens',0));usage['outputTokens']+=max(0,u.get('output_tokens',0))
            content=([{'type':'text','text':m.text}] if m.text else [])+[{'type':'toolCall','id':c['id'],'name':c['name'],'arguments':c['args']} for c in m.tool_calls]
            await event_message('assistant',content,api='langchain-deepagents',provider=config.get('provider','openai'),model=config.get('model','gpt-6-luna'),stopReason='toolUse' if m.tool_calls else 'stop')
        await emit({'type':'usage','usage':dict(usage)})
        return response
    @wrap_tool_call
    async def host_tools(request,handler):
        call=request.tool_call;name=call['name'];call_id=call['id']
        if call_id in seen: raise AgentFailure('DUPLICATE_TOOL_CALL')
        seen.add(call_id);usage['toolCalls']+=1
        if usage['toolCalls']>limits['maxToolCalls']: raise AgentFailure('TOOL_CALL_LIMIT')
        await emit({'type':'tool_start','name':name,'callId':call_id})
        if name in definitions:
            result=await rpc('tool',{'name':name,'callId':call_id,'arguments':call['args']})
            parts=result.get('content',[])
            if len(json_text(bounded_text(parts)))>limits['maxContextChars']: raise AgentFailure('CONTEXT_LIMIT')
            message=ToolMessage(content=model_content(parts),tool_call_id=call_id,name=name,status='error' if result.get('isError') else 'success')
            await event_message('toolResult',transcript_content(parts),toolCallId=call_id,toolName=name,isError=bool(result.get('isError')))
        else:
            message=await handler(request)
            await event_message('toolResult',[{'type':'text','text':str(message.content)[:20000]}],toolCallId=call_id,toolName=name,isError=getattr(message,'status','success')=='error')
        await emit({'type':'tool_end','name':name,'callId':call_id,'isError':getattr(message,'status','success')=='error'})
        await emit({'type':'usage','usage':dict(usage)})
        return message
    messages=[HumanMessage(content=m['content']) if m['role']=='user' else AIMessage(content=m['content']) for m in history_input(config['history'])]
    parts=[{'type':'text','text':config['text']}]
    for media in config.get('media',[]):
        if media['kind']=='image': parts.append({'type':'image_url','image_url':{'url':media['dataUrl'],'detail':'auto'}})
        elif media['kind']=='text': parts.append({'type':'text','text':'Untrusted attachment reference: '+json_text({'name':media['name'],'text':media['text']})})
        else: parts.append({'type':'text','text':'Attachment is view-only and has NOT been analyzed: '+media['name']})
    messages.append(HumanMessage(content=parts if len(parts)>1 else config['text']))
    await event_message('user',config['text'])
    try:
        graph=create_deep_agent(model=model,tools=tools,backend=StateBackend(),middleware=[
            FilesystemMiddleware(backend=StateBackend(),tools=['ls','read_file','write_file','edit_file','glob','grep']),NoDelegation(),HostContextBudget(),TodoListMiddleware(),budget,host_tools])
        last={}
        async with asyncio.timeout(limits['timeoutMs']/1000):
            async for mode,chunk in graph.astream({'messages':messages},config={'recursion_limit':limits['maxModelCalls']*4+8},stream_mode=['messages','values']):
                if mode=='values': last=chunk
                elif mode=='messages':
                    message,_metadata=chunk
                    if isinstance(message,AIMessageChunk) and message.text: await emit({'type':'text_delta','text':message.text})
        final=next((m for m in reversed(last.get('messages',[])) if isinstance(m,AIMessage)),None)
        return {'result':final.text if final else '', 'usage':usage}
    except TimeoutError: return {'errorCode':'TIMEOUT','usage':usage}
    except AgentFailure as error: return {'errorCode':str(error),'usage':usage}
    except Exception: return {'errorCode':'MODEL_ERROR','usage':usage}
