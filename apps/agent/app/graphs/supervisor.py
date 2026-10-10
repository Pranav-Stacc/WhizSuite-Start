from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator
from typing import Any, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.config import settings
from app.tools.nest_client import NestCapabilityClient

DEFAULT_PLANNER_PROMPT = """
You are WhizSuite Agency OS AI. The product UI is chat-only — the user never fills
agent/schedule forms. You execute requests with tools.

What you can do from chat (use the matching toolIds):
- Domain work: create/update clients, tasks, content, calendar, finance, team, etc.
- Schedules: if the user wants something recurring ("every Monday", "daily at 9"),
  call agents.schedules.create with name, prompt, cron, timezone (default UTC).
  Cron examples: daily 9am = "0 9 * * *", every Monday 9am = "0 9 * * 1".
- Custom agents: call agents.definitions.create ONLY when the user asks to save a
  reusable specialist agent, OR a complex ongoing workflow truly needs a named
  agent with its own systemPrompt/subAgents. Do NOT create agents for simple
  one-shot asks (e.g. "create a client").
- Prefer executing tools over asking clarifying questions when intent is clear.
- You may call multiple tools in one response (e.g. create client then create task).
- Use conversation history for context (follow-ups, corrections, prior IDs).

Respond with JSON only (no markdown fences):
{"summary": string, "tool_calls": [{"toolId": string, "input": object}]}
If no tools are needed, return {"summary": string, "tool_calls": []}.
""".strip()

SUMMARY_SYSTEM_PROMPT = """
You are the Agency AI voice. Summarize what happened for the user.

Format rules (strict):
- Respond in GitHub-flavored Markdown (not plain walls of text).
- Start with a one-line bold outcome, then short sections.
- Use ## headings, bullet lists, and **bold** for key names/IDs.
- If tools ran: a "What I did" section with one bullet per tool (success or failure).
- If something failed: a "Needs attention" section with the error in plain language.
- If approval is required: say so clearly and tell them to tap Approve.
- If listing many tools/capabilities: group by module with ## headings and bullets — never a single paragraph.
- Keep it scannable; prefer lists over long prose.
- Do not wrap the whole reply in a code fence.
""".strip()

# Simple in-process tool catalog cache between runs (same process).
_TOOL_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_TOOL_CACHE_TTL_SEC = 90.0


class AgentState(TypedDict, total=False):
    message: str
    response: str
    steps: list[dict[str, Any]]
    pending_action_id: str | None
    tool_plan: list[dict[str, Any]]


def build_chat_model(*, streaming: bool = False) -> BaseChatModel:
    provider = (settings.llm_provider or "gemini").strip().lower()
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            api_key=settings.openai_api_key or None,
            model=settings.default_model,
            temperature=0.2,
            streaming=streaming,
        )
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            api_key=settings.anthropic_api_key or None,
            model=settings.default_model,
            temperature=0.2,
            streaming=streaming,
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        google_api_key=settings.gemini_api_key or None,
        model=settings.default_model,
        temperature=0.2,
    )


def parse_llm_json(raw: str) -> dict[str, Any]:
    text = str(raw).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def compact_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep tool catalog small enough for the planner context window."""
    compact: list[dict[str, Any]] = []
    for tool in tools:
        compact.append(
            {
                "id": tool.get("id"),
                "name": tool.get("name"),
                "module": tool.get("module"),
                "description": tool.get("description"),
                "riskTier": tool.get("riskTier"),
            }
        )
    return compact


def rank_tools_for_message(
    message: str, tools: list[dict[str, Any]], *, limit: int = 48
) -> list[dict[str, Any]]:
    """Prefer tools whose id/name/module/description match the user request."""
    tokens = {t.lower() for t in re.findall(r"[a-zA-Z0-9_]{3,}", message)}
    if not tokens:
        return tools[:limit]

    scored: list[tuple[int, dict[str, Any]]] = []
    for tool in tools:
        blob = " ".join(
            str(tool.get(k) or "") for k in ("id", "name", "module", "description")
        ).lower()
        score = sum(1 for tok in tokens if tok in blob)
        # Soft boost for agent meta tools when user mentions agent/schedule.
        tid = str(tool.get("id") or "")
        if "agent" in tokens and tid.startswith("agents."):
            score += 3
        if "schedule" in tokens and "schedule" in tid:
            score += 3
        scored.append((score, tool))

    scored.sort(key=lambda item: (-item[0], str(item[1].get("id") or "")))
    top = [t for s, t in scored if s > 0][:limit]
    if len(top) >= min(12, limit):
        return top
    # Always include some catalog breadth so the model is not over-constrained.
    seen = {t.get("id") for t in top}
    for tool in tools:
        if tool.get("id") in seen:
            continue
        top.append(tool)
        if len(top) >= limit:
            break
    return top


async def _load_tools(
    client: NestCapabilityClient, tool_ids: list[str] | None
) -> list[dict[str, Any]]:
    import time

    cache_key = client.organization_id
    now = time.time()
    cached = _TOOL_CACHE.get(cache_key)
    if cached and now - cached[0] < _TOOL_CACHE_TTL_SEC:
        tools = cached[1]
    else:
        tools = await client.list_tools()
        _TOOL_CACHE[cache_key] = (now, tools)

    if tool_ids:
        allowed = set(tool_ids)
        tools = [t for t in tools if t["id"] in allowed]
    return tools


def _history_messages(history: list[dict[str, str]] | None) -> list[BaseMessage]:
    msgs: list[BaseMessage] = []
    for item in (history or [])[-12:]:
        role = (item.get("role") or "").lower()
        content = (item.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            msgs.append(HumanMessage(content=content))
        elif role == "assistant":
            msgs.append(AIMessage(content=content))
    return msgs


def _chunk_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
            else:
                text = getattr(block, "text", None)
                if text:
                    parts.append(str(text))
        return "".join(parts)
    return str(content)


async def run_supervisor_graph_stream(
    *,
    message: str,
    run_token: str,
    organization_id: str,
    run_id: str,
    multi_agent: bool,
    system_prompt: str | None,
    sub_agents: list[dict[str, str]] | None,
    tool_ids: list[str] | None,
    history: list[dict[str, str]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    client = NestCapabilityClient(settings.api_base_url, run_token, organization_id)
    tools = await _load_tools(client, tool_ids)
    ranked = rank_tools_for_message(message, tools)

    model = build_chat_model(streaming=False)
    stream_model = build_chat_model(streaming=True)
    planner_prompt = system_prompt or DEFAULT_PLANNER_PROMPT

    if multi_agent and sub_agents:
        planner_prompt += "\nConfigured sub-agents: " + json.dumps(sub_agents)
    elif multi_agent:
        planner_prompt += (
            "\nMulti-agent mode is on: for complex work you may create a specialist "
            "via agents.definitions.create, then continue with domain tools. "
            "Skip agent creation for simple single-step requests."
        )

    yield {"type": "status", "phase": "planning", "detail": "Planning the next steps"}

    plan_messages: list[BaseMessage] = [
        SystemMessage(content=planner_prompt),
        *_history_messages(history),
        HumanMessage(
            content=(
                f"User request: {message}\n\n"
                f"Available tools (ranked for this request):\n"
                f"{json.dumps(compact_tools(ranked), indent=2)[:14000]}"
            )
        ),
    ]

    plan_msg = await model.ainvoke(plan_messages)

    steps: list[dict[str, Any]] = [
        {
            "agentName": "planner",
            "stepType": "plan",
            "status": "COMPLETED",
            "output": {"content": plan_msg.content},
        }
    ]

    pending_action_id: str | None = None
    tool_results: list[Any] = []
    parsed = parse_llm_json(str(plan_msg.content))
    tool_calls = parsed.get("tool_calls") or []
    if not isinstance(tool_calls, list):
        tool_calls = []

    plan_summary = str(parsed.get("summary") or "Working on your request…")
    yield {
        "type": "plan",
        "summary": plan_summary,
        "toolCount": len([c for c in tool_calls if isinstance(c, dict)]),
    }

    executor_name = "executor"
    if multi_agent:
        steps.append(
            {
                "agentName": "supervisor",
                "stepType": "delegate",
                "status": "COMPLETED",
                "output": {"executor": executor_name},
            }
        )

    priority = {
        "agents.definitions.create": 0,
        "agents.definitions.list": 1,
        "agents.schedules.create": 2,
        "agents.schedules.list": 3,
    }

    def sort_key(call: dict[str, Any]) -> tuple[int, int]:
        tid = str(call.get("toolId") or call.get("tool_id") or "")
        return (priority.get(tid, 50), 0)

    ordered_calls = sorted(
        [c for c in tool_calls if isinstance(c, dict)],
        key=sort_key,
    )

    if ordered_calls:
        yield {
            "type": "status",
            "phase": "executing",
            "detail": f"Running {min(len(ordered_calls), 12)} tool(s)",
        }

    for call in ordered_calls[:12]:
        tool_id = call.get("toolId") or call.get("tool_id")
        if not tool_id:
            continue
        input_data = call.get("input") or {}
        if not isinstance(input_data, dict):
            input_data = {}

        yield {"type": "tool.start", "toolId": str(tool_id), "input": input_data}

        try:
            result = await client.execute(str(tool_id), input_data, run_id)
            ok = not (
                isinstance(result, dict)
                and result.get("status") in {"error", "failed"}
            )
            err = None
            if isinstance(result, dict) and result.get("status") == "error":
                err = str(result.get("error") or result.get("message") or "Tool failed")
                ok = False
        except Exception as exc:  # noqa: BLE001
            result = {"status": "error", "error": str(exc)}
            ok = False
            err = str(exc)

        tool_results.append({"toolId": tool_id, "result": result})
        if isinstance(result, dict) and result.get("status") == "pending_confirmation":
            pending_action_id = result.get("pendingActionId")

        yield {
            "type": "tool.result",
            "toolId": str(tool_id),
            "ok": ok,
            "result": result if ok else None,
            "error": err,
        }

        steps.append(
            {
                "agentName": executor_name,
                "stepType": "tool",
                "status": "COMPLETED" if ok else "FAILED",
                "input": {"toolId": tool_id, "input": input_data},
                "output": result if isinstance(result, dict) else {"value": result},
            }
        )

    yield {"type": "status", "phase": "summarizing", "detail": "Writing your answer"}

    summary_messages: list[BaseMessage] = [
        SystemMessage(content=SUMMARY_SYSTEM_PROMPT),
        HumanMessage(
            content=json.dumps(
                {
                    "request": message,
                    "planner_summary": parsed.get("summary"),
                    "tool_results": tool_results,
                },
                default=str,
            )[:12000]
        ),
    ]

    summary_parts: list[str] = []
    try:
        async for chunk in stream_model.astream(summary_messages):
            text = _chunk_text(getattr(chunk, "content", chunk))
            if not text:
                continue
            summary_parts.append(text)
            yield {"type": "summary.delta", "text": text}
    except Exception:  # noqa: BLE001 — fall back to non-streaming summarize
        summary_msg = await model.ainvoke(summary_messages)
        text = _chunk_text(summary_msg.content)
        summary_parts.append(text)
        # Fake progressive chunks so the UI still streams tall answers.
        step = 48
        for i in range(0, len(text), step):
            yield {"type": "summary.delta", "text": text[i : i + step]}

    summary_text = "".join(summary_parts).strip() or plan_summary

    steps.append(
        {
            "agentName": "critic",
            "stepType": "summarize",
            "status": "COMPLETED",
            "output": {"content": summary_text, "format": "markdown"},
        }
    )

    yield {
        "type": "done",
        "response": summary_text,
        "pendingActionId": pending_action_id,
        "runId": run_id,
        "stepCount": len(steps),
        "steps": steps,
    }


async def run_supervisor_graph(
    *,
    message: str,
    run_token: str,
    organization_id: str,
    run_id: str,
    multi_agent: bool,
    system_prompt: str | None,
    sub_agents: list[dict[str, str]] | None,
    tool_ids: list[str] | None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    response = ""
    steps: list[dict[str, Any]] = []
    pending_action_id: str | None = None

    async for event in run_supervisor_graph_stream(
        message=message,
        run_token=run_token,
        organization_id=organization_id,
        run_id=run_id,
        multi_agent=multi_agent,
        system_prompt=system_prompt,
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


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("end", lambda s: s)
    graph.set_entry_point("end")
    graph.add_edge("end", END)
    return graph.compile()
