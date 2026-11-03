"""Offline transport used only by tests and the local renderer smoke test."""
import asyncio
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "python/me_studio_agent"))
from worker import serve


class ScriptedProvider:
    def __init__(self, _key):
        self.step = 0

    async def close(self):
        pass

    async def generate(self, system, messages, tools, limits, emit):
        self.step += 1
        user = next(m["content"] for m in reversed(messages) if m.get("role") == "user")
        def call(name, args, suffix=""):
            return {"type": "function_call", "name": name, "arguments": json.dumps(args), "call_id": f"call-{self.step}-{suffix}"}
        def text(value):
            return {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": value, "annotations": []}]}
        output = []
        if user == "provider_error":
            raise RuntimeError("SECRET_PROVIDER_BODY sk-never-forward-this-secret")
        elif user == "prior":
            output = [text("legacy restored" if any(m.get("content") == "legacy answer" for m in messages) and "Milo" in system else "missing")]
        elif user == "wait":
            await asyncio.sleep(20)
        elif user == "environment":
            output = [text("leaked" if os.getenv("OPENAI_API_KEY") or os.getenv("PYTHONPATH") else "clean")]
        elif user == "loop":
            output = [call("recall_project_memory", {})]
        elif user == "too_many":
            output = [call("remember_project_memory", {"key": "name", "value": "Milo", "expectedRevision": 0}, str(i)) for i in range(2)]
        elif user.startswith("remember") and self.step == 1:
            output = [call("remember_project_memory", {"key": "character.name", "value": "Milo", "expectedRevision": 0})]
        elif user == "malformed" and self.step == 1:
            output = [{**call("remember_project_memory", {}), "arguments": "not-json"}]
        elif user == "render_html":
            design = {"title": "ความทรงจำที่เคลื่อนไหว", "html": "<style>body{background:#eee6d8;color:#37332f;display:grid;place-items:center;font-family:Arial}.card{padding:48px;animation:arrival 2s both}h1{font-size:50px;font-weight:400}@keyframes arrival{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}</style><main class='card'><h1>Our story</h1><p>One year. A thousand memories.</p></main>", "width": 640, "height": 480, "durationSeconds": 3, "narration": ""}
            steps = [("save_html_animation", design), ("render_video", {"requireVoice": False})]
            output = [call(*steps[self.step-1])] if self.step <= len(steps) else [text("สร้าง HTML animation จริงแล้ว")]
        elif user == "render":
            scene = {"title": "Python runtime demo", "durationSeconds": 3, "layout": "portrait", "background": "city-night", "characters": [{"name": "บิว", "shirt": "#42a5f5"}, {"name": "แมค", "shirt": "#fb8c00"}], "cues": [{"start": .1, "end": 1.2, "speaker": 0, "text": "สวัสดี", "action": "wave"}], "ending": "ยินดีที่ได้รู้จัก"}
            steps = [("read_video_skills", {}), ("save_animation", scene), ("render_video", {"requireVoice": False})]
            output = [call(*steps[self.step-1])] if self.step <= len(steps) else [text("สร้าง MP4 จาก Python agent loop แล้ว")]
        else:
            output = [text("Milo recalled" if "Milo" in system else "completed")]
        for item in output:
            if item["type"] == "message":
                await emit({"type": "text_delta", "text": item["content"][0]["text"]})
        return {"output": output, "inputTokens": 12, "outputTokens": 5}


asyncio.run(serve(ScriptedProvider))
