import sys
import unittest
from pathlib import Path
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'me_studio_agent'))
from context import fit_context, context_size

class ContextTests(unittest.TestCase):
    def test_complete_old_tool_cycles_compact_without_orphan_calls_or_changing_original(self):
        messages=[HumanMessage(content='Keep the approved blue palette. Create the animation.',id='current')]
        for i in range(4):
            messages.extend([AIMessage(content='',tool_calls=[{'id':str(i),'name':'save_html_animation','args':{'html':'x'*18000}}]),ToolMessage(content='saved design-'+str(i)+'.html',tool_call_id=str(i),name='save_html_animation')])
        fitted=fit_context('host instructions',messages,[],24000)
        self.assertLessEqual(context_size('host instructions',fitted,[]),24000)
        self.assertIn('approved blue palette',fitted[0].content)
        self.assertEqual(messages[1].tool_calls[0]['args']['html'],'x'*18000)
        self.assertEqual(fitted[-2].tool_calls[0]['id'],'3')
        calls={c['id'] for m in fitted if isinstance(m,AIMessage) for c in m.tool_calls}
        self.assertEqual(calls,{m.tool_call_id for m in fitted if isinstance(m,ToolMessage)})
    def test_pending_tools_and_current_request_are_never_removed_to_fake_fitting(self):
        messages=[HumanMessage(content='x'*2000),AIMessage(content='',tool_calls=[{'id':'pending','name':'save','args':{'html':'x'*4000}}])]
        with self.assertRaisesRegex(ValueError,'CONTEXT_LIMIT'):fit_context('',messages,[],1000)
    def test_old_history_can_be_dropped_but_current_request_and_latest_inspection_survive(self):
        messages=[HumanMessage(content='old request'),AIMessage(content='old code'*4000),HumanMessage(content='CURRENT: revise the current draft'),AIMessage(content='',tool_calls=[{'id':'latest','name':'inspect','args':{}}]),ToolMessage(content='latest inspection evidence',tool_call_id='latest')]
        fitted=fit_context('',messages,[],4000)
        self.assertIn('CURRENT',fitted[0].content)
        self.assertEqual(fitted[-1].content,'latest inspection evidence')
    def test_fixed_system_and_tools_still_enforce_budget(self):
        with self.assertRaisesRegex(ValueError,'CONTEXT_LIMIT'):fit_context('x'*5000,[HumanMessage(content='hi')],[],4000)
    def test_adapter_metadata_is_not_model_input_and_calls_are_not_double_counted(self):
        m=AIMessage(content=[{'type':'function_call','call_id':'one','name':'save','arguments':'x'*3000}],tool_calls=[{'id':'one','name':'save','args':{'html':'x'*3000}}],response_metadata={'diagnostics':'x'*100000})
        messages=[HumanMessage(content='keep this request'),m,ToolMessage(content='saved',tool_call_id='one')]
        self.assertLess(context_size('',messages,[]),5000)
