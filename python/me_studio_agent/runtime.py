"""Small asynchronous agent loop. Host RPC owns tools, scopes and durable memory."""
import asyncio
import json
import time


class AgentFailure(Exception):
    pass


def json_text(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def transcript_arguments(call):
    try:
        value = json.loads(call.get("arguments", "{}"))
        return value if isinstance(value, dict) else {}
    except (ValueError, TypeError):
        return {}


def history_input(messages):
    """Keep whole completed conversational turns, without orphan Pi tool calls."""
    result = []
    for message in messages:
        if message.get("role") not in ("user", "assistant"):
            continue
        content = message.get("content", "")
        text = content if isinstance(content, str) else "".join(
            p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
        )
        if text:
            result.append({"role": message["role"], "content": text})
    return result


class OpenAIProvider:
    def __init__(self, api_key, http_client=None, model="gpt-6-luna", provider="openai"):
        self.model = model
        self.provider = provider
        endpoints = {"openai": "https://api.openai.com/v1", "openrouter": "https://openrouter.ai/api/v1", "meta": "https://api.meta.ai/v1"}
        if provider not in endpoints:
            raise ValueError("INVALID_PROVIDER")
        from openai import AsyncOpenAI
        import httpx
        # Explicit endpoint, no inherited proxy/auth settings and no automatic retries.
        self.client = AsyncOpenAI(
            api_key=api_key, base_url=endpoints[provider], max_retries=0,
            timeout=90, http_client=http_client or httpx.AsyncClient(trust_env=False),
        )

    async def close(self):
        await self.client.close()

    async def generate(self, system, messages, tools, limits, emit):
        response = None
        stream = await self.client.responses.create(
            model=self.model, instructions=system, input=messages, tools=tools,
            max_output_tokens=limits["maxOutputTokens"], reasoning={"effort": "low"},
            parallel_tool_calls=False, store=False, stream=True,
            include=["reasoning.encrypted_content"],
        )
        try:
            async for event in stream:
                if event.type == "response.output_text.delta":
                    await emit({"type": "text_delta", "text": event.delta})
                elif event.type == "response.completed":
                    response = event.response
                elif event.type in ("response.failed", "response.incomplete", "error"):
                    raise AgentFailure("MODEL_ERROR")
        finally:
            await stream.close()
        if response is None or response.status != "completed":
            raise AgentFailure("MODEL_ERROR")
        return {
            "output": [item.model_dump(mode="json", exclude_none=True) for item in response.output],
            "inputTokens": response.usage.input_tokens if response.usage else 0,
            "outputTokens": response.usage.output_tokens if response.usage else 0,
        }


async def run_agent(config, provider, rpc, emit):
    limits = config["limits"]
    usage = {"modelCalls": 0, "toolCalls": 0, "inputTokens": 0, "outputTokens": 0}
    tools = [{"type": "function", "name": t["name"], "description": t["description"],
              "parameters": t["parameters"], "strict": False} for t in config["tools"]]
    names = {t["name"] for t in tools}
    messages = history_input(config["history"])
    messages.append({"role": "user", "content": config["text"]})
    seen_calls = set()
    await emit({"type": "message", "message": {
        "role": "user", "content": config["text"], "timestamp": int(time.time() * 1000),
    }})
    try:
        async with asyncio.timeout(limits["timeoutMs"] / 1000):
            while True:
                if usage["modelCalls"] >= limits["maxModelCalls"]:
                    raise AgentFailure("MODEL_CALL_LIMIT")
                system = await rpc("context", {})
                if len(json_text({"system": system, "messages": messages, "tools": tools})) > limits["maxContextChars"]:
                    raise AgentFailure("CONTEXT_LIMIT")
                usage["modelCalls"] += 1
                await emit({"type": "usage", "usage": dict(usage)})
                turn = await provider.generate(system, messages, tools, limits, emit)
                usage["inputTokens"] += max(0, turn.get("inputTokens", 0))
                usage["outputTokens"] += max(0, turn.get("outputTokens", 0))
                await emit({"type": "usage", "usage": dict(usage)})
                output = turn["output"]
                calls = [part for part in output if part.get("type") == "function_call"]
                text = "".join(p.get("text", "") for part in output if part.get("type") == "message"
                               for p in part.get("content", []) if p.get("type") == "output_text")
                transcript = ([{"type": "text", "text": text}] if text else []) + [
                    {"type": "toolCall", "id": call["call_id"], "name": call["name"], "arguments": transcript_arguments(call)}
                    for call in calls
                ]
                await emit({"type": "message", "message": {
                    "role": "assistant", "content": transcript, "timestamp": int(time.time() * 1000),
                    "api": "openai-responses", "provider": config.get("provider", "openai"), "model": config.get("model", "gpt-6-luna"),
                    "stopReason": "toolUse" if calls else "stop",
                }})
                usage["toolCalls"] += len(calls)
                await emit({"type": "usage", "usage": dict(usage)})
                if usage["toolCalls"] > limits["maxToolCalls"]:
                    raise AgentFailure("TOOL_CALL_LIMIT")
                if not calls:
                    return {"result": text, "usage": usage}
                messages.extend(output)
                for call in calls:
                    call_id, name = call["call_id"], call["name"]
                    if call_id in seen_calls:
                        raise AgentFailure("DUPLICATE_TOOL_CALL")
                    seen_calls.add(call_id)
                    await emit({"type": "tool_start", "name": name, "callId": call_id})
                    try:
                        args = json.loads(call["arguments"])
                        if not isinstance(args, dict) or name not in names:
                            raise ValueError()
                    except (ValueError, TypeError):
                        result = {"content": [{"type": "text", "text": "INVALID_TOOL_ARGUMENTS"}], "isError": True}
                    else:
                        result = await rpc("tool", {"name": name, "callId": call_id, "arguments": args})
                    serialized = json_text(result.get("content", []))
                    if len(serialized) > limits["maxContextChars"]:
                        raise AgentFailure("CONTEXT_LIMIT")
                    messages.append({"type": "function_call_output", "call_id": call_id, "output": serialized})
                    await emit({"type": "message", "message": {
                        "role": "toolResult", "toolCallId": call_id, "toolName": name,
                        "content": result.get("content", []), "isError": bool(result.get("isError")),
                        "timestamp": int(time.time() * 1000),
                    }})
                    await emit({"type": "tool_end", "name": name, "callId": call_id,
                                "isError": bool(result.get("isError"))})
    except TimeoutError:
        return {"errorCode": "TIMEOUT", "usage": usage}
    except AgentFailure as error:
        return {"errorCode": str(error), "usage": usage}
    except Exception:
        # Never return provider exception bodies, credentials or local tracebacks.
        return {"errorCode": "MODEL_ERROR", "usage": usage}
