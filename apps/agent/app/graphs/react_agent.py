"""
ReAct agent: LLM invokes tools natively via bind_tools (no JSON plan step).
Tools execute immediately when the model emits tool_calls; results feed the next turn.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage

from app.config import settings
from app.message_attachments import build_human_message
from app.graphs.supervisor import (
    CHAT_ROOM_SUMMARY_PROMPT,
    SUMMARY_SYSTEM_PROMPT,
    _chunk_text,
    _history_messages,
    _load_tools,
    build_chat_model,
    rank_tools_for_message,
)
from app.runtime import acquire_tool_slot
from app.tools.mcp_tools import to_openai_tools
from app.tools.nest_client import NestCapabilityClient

REACT_SYSTEM_PROMPT = """
You are WhizSuite Agency OS AI. The product UI is chat-only — execute requests with tools.

Rules:
- Call tools directly via function calling when the user wants something done.
- You may emit multiple tool calls in one turn; independent reads run in parallel.
- After tool results arrive, call more tools or answer the user — do not stop after one wave
  if the task is incomplete.
- One-time reminders → calendar.create. Use startsAt/endsAt as ISO-8601 UTC after converting from the user's local time (see Runtime context in the system message). Recurring → agents.schedules.create (cron + timezone).
- Use exact field names from each tool schema (e.g. clients.create needs displayName).
- Prefer action over clarifying questions when intent is clear.
- PDF and image attachments are sent inline — read them directly; never ask the user to re-type PDF contents.
- For invoice PDFs: extract client, line items, amounts, tax, and dates, then use finance tools to create the invoice.
- For demo / test-all requests: run representative reads then safe writes with demo data.
""".strip()


def _result_ok(result: Any) -> tuple[bool, str | None]:
    if isinstance(result, dict) and result.get("status") == "error":
        return False, str(result.get("error") or result.get("message") or "Tool failed")
    if isinstance(result, dict) and result.get("status") in {"error", "failed"}:
        return False, str(result.get("message") or "Tool failed")
    return True, None


async def _execute_tool(
    client: NestCapabilityClient,
    tool_id: str,
    args: dict[str, Any],
    run_id: str,
) -> tuple[Any, bool, str | None, str | None]:
    """Run one MCP tools/call; returns (result, ok, error, pendingActionId)."""
    async with acquire_tool_slot():
        try:
            result = await client.execute(tool_id, args, run_id)
            ok, err = _result_ok(result)
            pending = None
            if isinstance(result, dict) and result.get("status") == "pending_confirmation":
                pending = str(result.get("pendingActionId") or "") or None
            return result, ok, err, pending
        except Exception as exc:  # noqa: BLE001
            return {"status": "error", "error": str(exc)}, False, str(exc), None


async def run_react_agent_stream(
    *,
    message: str,
    run_token: str,
    organization_id: str,
    run_id: str,
    multi_agent: bool,
    system_prompt: str | None,
    summary_prompt: str | None = None,
    sub_agents: list[dict[str, str]] | None,
    tool_ids: list[str] | None,
    history: list[dict[str, str]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    client = NestCapabilityClient(settings.api_base_url, run_token, organization_id)
    catalog = await _load_tools(client, tool_ids)
    bound_limit = min(48, max(8, settings.max_bound_tools))
    ranked = rank_tools_for_message(message, catalog, limit=bound_limit)
    openai_tools = to_openai_tools(ranked)

    sys = system_prompt or REACT_SYSTEM_PROMPT
    if multi_agent and sub_agents:
        sys += "\nConfigured sub-agents: " + json.dumps(sub_agents)
    elif multi_agent:
        sys += (
            "\nMulti-agent mode: create specialists via agents.definitions.create only for "
            "reusable workflows, not one-shot tasks."
        )

    model = build_chat_model(streaming=True).bind_tools(openai_tools)
    stream_model = build_chat_model(streaming=True)

    human = await build_human_message(message, client)
    messages: list[BaseMessage] = [
        SystemMessage(content=sys),
        *_history_messages(history),
        human,
    ]

    steps: list[dict[str, Any]] = []
    pending_action_id: str | None = None
    total_tool_calls = 0
    final_text = ""

    yield {"type": "status", "phase": "thinking", "detail": "Connecting tools"}

    for iteration in range(settings.max_agent_iterations):
        yield {
            "type": "status",
            "phase": "thinking",
            "detail": f"Reasoning (step {iteration + 1})",
        }

        # Stream model turn; emit tool deltas and answer tokens as they arrive.
        gathered: AIMessage | None = None
        streamed_answer = False
        answer_parts: list[str] = []
        async for chunk in model.astream(messages):
            if not isinstance(chunk, AIMessage):
                continue
            gathered = gathered + chunk if gathered is not None else chunk
            for tc in chunk.tool_call_chunks or []:
                name = tc.get("name") or tc.get("id")
                if name:
                    yield {
                        "type": "tool.call.delta",
                        "toolId": str(name),
                        "index": tc.get("index"),
                    }
            text = _chunk_text(getattr(chunk, "content", chunk))
            if text and not (chunk.tool_call_chunks or []):
                if not streamed_answer:
                    yield {
                        "type": "status",
                        "phase": "summarizing",
                        "detail": "Writing your answer",
                    }
                    streamed_answer = True
                answer_parts.append(text)
                yield {"type": "summary.delta", "text": text}

        if gathered is None:
            gathered = await model.ainvoke(messages)

        if not gathered.tool_calls:
            if streamed_answer:
                final_text = "".join(answer_parts).strip() or _chunk_text(gathered.content)
            elif steps:
                # After tool runs, polish the reply with the summary voice (one extra pass).
                yield {"type": "status", "phase": "summarizing", "detail": "Writing your answer"}
                parts: list[str] = []
                voice = summary_prompt or SUMMARY_SYSTEM_PROMPT
                if summary_prompt == CHAT_ROOM_SUMMARY_PROMPT:
                    voice_messages: list[BaseMessage] = [
                        SystemMessage(content=voice),
                        HumanMessage(content=message),
                        gathered,
                    ]
                else:
                    voice_messages = [
                        SystemMessage(content=voice),
                        HumanMessage(
                            content=json.dumps(
                                {"request": message, "assistant_draft": gathered.content},
                                default=str,
                            )[:12000]
                        ),
                    ]
                async for chunk in stream_model.astream(voice_messages):
                    text = _chunk_text(getattr(chunk, "content", chunk))
                    if not text:
                        continue
                    parts.append(text)
                    yield {"type": "summary.delta", "text": text}
                final_text = "".join(parts).strip() or _chunk_text(gathered.content)
            else:
                draft = _chunk_text(gathered.content)
                if draft:
                    yield {"type": "status", "phase": "summarizing", "detail": "Writing your answer"}
                    yield {"type": "summary.delta", "text": draft}
                    final_text = draft
                else:
                    yield {"type": "status", "phase": "summarizing", "detail": "Writing your answer"}
                    parts: list[str] = []
                    voice = summary_prompt or SUMMARY_SYSTEM_PROMPT
                    voice_messages = [
                        SystemMessage(content=voice),
                        HumanMessage(content=message),
                    ]
                    async for chunk in stream_model.astream(voice_messages):
                        text = _chunk_text(getattr(chunk, "content", chunk))
                        if not text:
                            continue
                        parts.append(text)
                        yield {"type": "summary.delta", "text": text}
                    final_text = "".join(parts).strip() or "Done."
            steps.append(
                {
                    "agentName": "assistant",
                    "stepType": "reply",
                    "status": "COMPLETED",
                    "output": {"content": final_text},
                }
            )
            break

        messages.append(gathered)

        # Execute every tool call from this turn immediately (parallel).
        calls = list(gathered.tool_calls)
        if total_tool_calls + len(calls) > settings.max_tool_calls_per_run:
            calls = calls[: max(0, settings.max_tool_calls_per_run - total_tool_calls)]

        if not calls:
            break

        yield {
            "type": "status",
            "phase": "executing",
            "detail": f"Running {len(calls)} tool(s)",
        }

        # Emit tool.start before gather (sequential announce, parallel execute).
        for tc in calls:
            tool_id = str(tc.get("name") or "")
            args = tc.get("args") if isinstance(tc.get("args"), dict) else {}
            call_id = str(tc.get("id") or tool_id)
            yield {
                "type": "tool.start",
                "toolId": tool_id,
                "input": args,
                "callId": call_id,
            }

        results = await asyncio.gather(*[_execute_tool(
            client,
            str(tc.get("name") or ""),
            tc.get("args") if isinstance(tc.get("args"), dict) else {},
            run_id,
        ) for tc in calls])

        for tc, (result, ok, err, pending) in zip(calls, results, strict=True):
            tool_id = str(tc.get("name") or "")
            call_id = str(tc.get("id") or tool_id)
            args = tc.get("args") if isinstance(tc.get("args"), dict) else {}
            total_tool_calls += 1
            if pending:
                pending_action_id = pending

            yield {
                "type": "tool.result",
                "toolId": tool_id,
                "ok": ok,
                "result": result if ok else None,
                "error": err,
                "callId": call_id,
            }
            steps.append(
                {
                    "agentName": "executor",
                    "stepType": "tool",
                    "status": "COMPLETED" if ok else "FAILED",
                    "input": {"toolId": tool_id, "input": args},
                    "output": result if isinstance(result, dict) else {"value": result},
                }
            )
            messages.append(
                ToolMessage(
                    content=json.dumps(result, default=str)[:16000],
                    tool_call_id=call_id,
                    name=tool_id,
                )
            )

        if pending_action_id:
            final_text = "This action needs your approval. Tap **Approve** to continue."
            yield {"type": "summary.delta", "text": final_text}
            break

    if not final_text:
        final_text = "Done."

    yield {
        "type": "done",
        "response": final_text,
        "pendingActionId": pending_action_id,
        "runId": run_id,
        "stepCount": len(steps),
        "steps": steps,
    }


async def run_react_agent(
    *,
    message: str,
    run_token: str,
    organization_id: str,
    run_id: str,
    multi_agent: bool,
    system_prompt: str | None,
    summary_prompt: str | None = None,
    sub_agents: list[dict[str, str]] | None,
    tool_ids: list[str] | None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    response = ""
    steps: list[dict[str, Any]] = []
    pending_action_id: str | None = None

    async for event in run_react_agent_stream(
        message=message,
        run_token=run_token,
        organization_id=organization_id,
        run_id=run_id,
        multi_agent=multi_agent,
        system_prompt=system_prompt,
        summary_prompt=summary_prompt,
        sub_agents=sub_agents,
        tool_ids=tool_ids,
        history=history,
    ):
        if event.get("type") == "done":
            response = str(event.get("response") or "")
            pending_action_id = event.get("pendingActionId")
            raw_steps = event.get("steps")
            if isinstance(raw_steps, list):
                steps = raw_steps

    return {
        "response": response,
        "steps": steps,
        "pendingActionId": pending_action_id,
    }
