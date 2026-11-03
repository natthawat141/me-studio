"""Private, bounded JSONL transport. No HTTP listener or arbitrary execution API."""
import asyncio
import json
import sys
import re
from pathlib import Path

if not getattr(sys, "frozen", False):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from runtime import OpenAIProvider, run_agent, json_text

MAX_LINE = 4_000_000


async def read_line():
    data = await asyncio.to_thread(sys.stdin.buffer.readline, MAX_LINE + 1)
    if not data or len(data) > MAX_LINE:
        raise RuntimeError("PROTOCOL_CLOSED")
    return json.loads(data)


async def send(value):
    sys.stdout.write(json_text(value) + "\n")
    sys.stdout.flush()


async def serve(provider_factory=OpenAIProvider):
    config = await read_line()
    if config.get("protocol") != 1 or not re.fullmatch(r"[a-zA-Z0-9._:/-]{1,160}", config.get("model", "")) or config.get("provider", "openai") not in ("openai", "openrouter", "meta"):
        raise RuntimeError("INVALID_PROTOCOL")
    provider = (OpenAIProvider(config["apiKey"], model=config["model"], provider=config.get("provider", "openai"), reasoning=config.get("reasoning","auto"), limits=config["limits"])
                if provider_factory is OpenAIProvider else provider_factory(config["apiKey"]))
    config.pop("apiKey", None)
    sequence = 0

    async def rpc(method, value):
        nonlocal sequence
        sequence += 1
        await send({"kind": "rpc", "id": sequence, "method": method, "input": value})
        response = await read_line()
        if response.get("kind") != "rpc_result" or response.get("id") != sequence:
            raise RuntimeError("INVALID_PROTOCOL")
        return response["result"]

    async def emit(event):
        await send({"kind": "event", "event": event})

    try:
        await send({"kind": "ready", "protocol": 1, "runtime": "python"})
        result = await run_agent(config, provider, rpc, emit)
        await send({"kind": "done", **result})
    finally:
        await provider.close()


if __name__ == "__main__":
    if "--version" in sys.argv:
        print("me-studio-agent python protocol=1")
    elif "--check" in sys.argv:
        async def check():
            provider = OpenAIProvider("diagnostic-placeholder-not-a-real-key")
            await provider.close()
            from diagnostics import check_graph
            await check_graph()
        asyncio.run(check())
        print("me-studio-agent python sdk-ready protocol=1")
    else:
        try:
            asyncio.run(serve())
        except Exception:
            # Protocol failures also have no raw exception output.
            print('{"kind":"fatal","errorCode":"PYTHON_RUNTIME_ERROR"}', flush=True)
            sys.exit(1)
