from __future__ import annotations

import json
import re
from typing import Any, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
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

Respond with JSON only (no markdown fences):
{"summary": string, "tool_calls": [{"toolId": string, "input": object}]}
If no tools are needed, return {"summary": string, "tool_calls": []}.
""".strip()


class AgentState(TypedDict, total=False):
    message: str
    response: str
    steps: list[dict[str, Any]]
    pending_action_id: str | None
    tool_plan: list[dict[str, Any]]


def build_chat_model() -> BaseChatModel:
    provider = (settings.llm_provider or "gemini").strip().lower()
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            api_key=settings.openai_api_key or None,
            model=settings.default_model,
            temperature=0.2,
        )
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            api_key=settings.anthropic_api_key or None,
            model=settings.default_model,
            temperature=0.2,
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
) -> dict[str, Any]:
    client = NestCapabilityClient(settings.api_base_url, run_token, organization_id)
    tools = await client.list_tools()
    if tool_ids:
        allowed = set(tool_ids)
        tools = [t for t in tools if t["id"] in allowed]

    model = build_chat_model()
    planner_prompt = system_prompt or DEFAULT_PLANNER_PROMPT

    if multi_agent and sub_agents:
        planner_prompt += "\nConfigured sub-agents: " + json.dumps(sub_agents)
    elif multi_agent:
        planner_prompt += (
            "\nMulti-agent mode is on: for complex work you may create a specialist "
            "via agents.definitions.create, then continue with domain tools. "
            "Skip agent creation for simple single-step requests."
        )

    plan_msg = await model.ainvoke(
        [
            SystemMessage(content=planner_prompt),
            HumanMessage(
                content=(
                    f"User request: {message}\n\n"
                    f"Available tools:\n{json.dumps(compact_tools(tools), indent=2)[:14000]}"
                )
            ),
        ]
    )

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

    # Prefer creating/listing agents or schedules before domain tools when both appear.
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

    for call in ordered_calls[:12]:
        tool_id = call.get("toolId") or call.get("tool_id")
        if not tool_id:
            continue
        input_data = call.get("input") or {}
        if not isinstance(input_data, dict):
            input_data = {}
        try:
            result = await client.execute(str(tool_id), input_data, run_id)
        except Exception as exc:  # noqa: BLE001 — surface tool failure to the user summary
            result = {"status": "error", "error": str(exc)}
        tool_results.append({"toolId": tool_id, "result": result})
        if isinstance(result, dict) and result.get("status") == "pending_confirmation":
            pending_action_id = result.get("pendingActionId")
        steps.append(
            {
                "agentName": executor_name,
                "stepType": "tool",
                "status": "COMPLETED",
                "input": {"toolId": tool_id, "input": input_data},
                "output": result,
            }
        )

    summary_msg = await model.ainvoke(
        [
            SystemMessage(
                content=(
                    "Summarize for the user in plain language. Mention what you did "
                    "(created client/agent/schedule/task, etc.). If a tool needs approval, "
                    "tell them to tap Approve. If something failed, say so clearly."
                )
            ),
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
    )

    steps.append(
        {
            "agentName": "critic",
            "stepType": "summarize",
            "status": "COMPLETED",
            "output": {"content": summary_msg.content},
        }
    )

    return {
        "response": str(summary_msg.content),
        "steps": steps,
        "pendingActionId": pending_action_id,
    }


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("end", lambda s: s)
    graph.set_entry_point("end")
    graph.add_edge("end", END)
    return graph.compile()
