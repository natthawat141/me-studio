"""Deterministic model-input compaction; never rewrites durable transcripts or files."""
import json
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

def bounded(value):
    if isinstance(value,dict) and value.get('type')=='image' and 'data' in value:return {'type':'text','text':'[bounded image]'}
    if isinstance(value,str): return '[bounded image]' if value.startswith('data:image/') else value
    if isinstance(value,list): return [bounded(v) for v in value]
    if isinstance(value,dict): return {k:bounded(v) for k,v in value.items()}
    return value

def context_size(system,messages,tools):
    inputs=[]
    for m in messages:
        content=m.content
        calls=m.tool_calls if isinstance(m,AIMessage) else []
        # Responses adapters expose a function call both in content and tool_calls.
        # Only one copy is replayed. Response diagnostics/usage are not model input.
        if calls and isinstance(content,list):
            ids={c['id'] for c in calls}
            content=[p for p in content if not (isinstance(p,dict) and p.get('type')=='function_call' and p.get('call_id') in ids)]
        item={'role':m.type,'content':content}
        if calls:item['tool_calls']=calls
        if isinstance(m,ToolMessage):item['tool_call_id']=m.tool_call_id
        inputs.append(item)
    return len(json.dumps(bounded({'system':system,'messages':inputs,'tools':tools}),ensure_ascii=False,separators=(',',':')))

def fit_context(system,messages,tools,maximum):
    result=list(messages)
    # Drop whole old dialogue turns first, keeping the current request intact.
    while context_size(system,result,tools)>maximum:
        humans=[i for i,m in enumerate(result) if isinstance(m,HumanMessage)]
        if len(humans)<2:break
        result=result[humans[1]:]
    # Retire completed older tool exchanges, never a pending call or the newest evidence.
    # This is an omission notice, not a semantic summary or a claim of successful work.
    while context_size(system,result,tools)>maximum:
        cycles=[]
        for start,m in enumerate(result):
            if not isinstance(m,AIMessage) or not m.tool_calls:continue
            ids={c['id'] for c in m.tool_calls};end=start+1;observed=[]
            while end<len(result) and isinstance(result[end],ToolMessage):
                observed.append(result[end]);end+=1
            if ids=={t.tool_call_id for t in observed}:cycles.append((start,end,observed))
        if len(cycles)<2:break
        start,end,observed=cycles[0]
        notice=AIMessage(content='[Earlier tool exchange omitted to keep context bounded: '+', '.join((t.name or 'tool')+(' failed' if t.status=='error' else ' returned a result') for t in observed)+'. Project files are unchanged; use Project tools to read the current draft if needed.]')
        result=result[:start]+[notice]+result[end:]
    if context_size(system,result,tools)>maximum:raise ValueError('CONTEXT_LIMIT')
    return result
