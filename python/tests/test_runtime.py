import json
import sys
import unittest
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "me_studio_agent"))
from runtime import OpenAIProvider, history_input


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_sdk_streams_fixed_responses_endpoint_with_no_retries(self):
        captured = []
        async def handler(request):
            captured.append(request)
            output = {"id": "msg_1", "type": "message", "role": "assistant", "status": "completed",
                      "content": [{"type": "output_text", "text": "สวัสดี", "annotations": []}]}
            events = [
                {"type": "response.output_text.delta", "delta": "สวัสดี", "item_id": "msg_1", "output_index": 0, "content_index": 0, "sequence_number": 1},
                {"type": "response.completed", "sequence_number": 2, "response": {
                    "id": "resp_1", "object": "response", "created_at": 0, "model": "gpt-6-luna", "status": "completed",
                    "output": [output], "usage": {"input_tokens": 10, "output_tokens": 2, "total_tokens": 12}}},
            ]
            return httpx.Response(200, headers={"content-type": "text/event-stream"},
                                  content="".join(f"event: {e['type']}\ndata: {json.dumps(e)}\n\n" for e in events))
        provider = OpenAIProvider("synthetic-test-key", httpx.AsyncClient(transport=httpx.MockTransport(handler), trust_env=False), model="gpt-6.1-sol")
        deltas = []
        async def emit(event):
            deltas.append(event)
        try:
            result = await provider.generate("system", [{"role": "user", "content": "hi"}], [], {"maxOutputTokens": 128}, emit)
            self.assertEqual(result["outputTokens"], 2)
            self.assertEqual(deltas[0]["text"], "สวัสดี")
            self.assertEqual(str(captured[0].url), "https://api.openai.com/v1/responses")
            body = json.loads(captured[0].content)
            self.assertEqual(body["model"], "gpt-6.1-sol")
            self.assertFalse(body["store"])
            self.assertFalse(body["parallel_tool_calls"])
        finally:
            await provider.close()

    async def test_provider_failure_has_no_automatic_retry(self):
        calls = 0
        async def handler(request):
            nonlocal calls
            calls += 1
            return httpx.Response(500, json={"error": {"message": "synthetic failure"}})
        provider = OpenAIProvider("synthetic-test-key", httpx.AsyncClient(transport=httpx.MockTransport(handler), trust_env=False))
        async def emit(_event):
            pass
        try:
            with self.assertRaises(Exception):
                await provider.generate("system", [], [], {"maxOutputTokens": 128}, emit)
            self.assertEqual(calls, 1)
        finally:
            await provider.close()

    async def test_meta_uses_fixed_responses_endpoint_and_selected_model(self):
        captured = []
        async def handler(request):
            captured.append(request)
            event = {"type": "response.completed", "sequence_number": 1, "response": {
                "id": "resp_meta", "object": "response", "created_at": 0, "model": "muse-spark-1.3",
                "status": "completed", "output": [], "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}}}
            return httpx.Response(200, headers={"content-type": "text/event-stream"},
                                  content=f"event: response.completed\ndata: {json.dumps(event)}\n\n")
        provider = OpenAIProvider("synthetic-meta-key", httpx.AsyncClient(transport=httpx.MockTransport(handler), trust_env=False), model="muse-spark-1.3", provider="meta")
        async def emit(_event):
            pass
        try:
            await provider.generate("system", [], [], {"maxOutputTokens": 128}, emit)
            self.assertEqual(str(captured[0].url), "https://api.meta.ai/v1/responses")
            self.assertEqual(json.loads(captured[0].content)["model"], "muse-spark-1.3")
        finally:
            await provider.close()

    def test_completed_pi_transcripts_keep_dialogue_without_orphan_tool_calls(self):
        messages = [{"role": "user", "content": "Milo"},
                    {"role": "assistant", "content": [{"type": "toolCall", "name": "save", "id": "old"}]},
                    {"role": "toolResult", "content": [{"type": "text", "text": "private tool result"}]},
                    {"role": "assistant", "content": [{"type": "text", "text": "saved"}]}]
        self.assertEqual(history_input(messages), [{"role": "user", "content": "Milo"}, {"role": "assistant", "content": "saved"}])


if __name__ == "__main__":
    unittest.main()
