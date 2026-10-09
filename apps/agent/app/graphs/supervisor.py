from __future__ import annotations

import json
from typing import Any, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.config import settings
from app.tools.nest_client import NestCapabilityClient


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

    planner_prompt = system_prompt or (
        "You are WhizSuite Agency OS AI. Plan and complete user requests using tools. "
        'Respond with JSON: {"summary": string, "tool_calls": [{"toolId": string, "input": object}]}'
    )

    if multi_agent and sub_agents:
        planner_prompt += "\nSub-agents: " + json.dumps(sub_agents)

    plan_msg = await model.ainvoke(
        [
            SystemMessage(content=planner_prompt),
            HumanMessage(
                content=(
                    f"User request: {message}\n\n"
                    f"Available tools:\n{json.dumps(tools, indent=2)[:12000]}"
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

    try:
        parsed = json.loads(str(plan_msg.content))
        tool_calls = parsed.get("tool_calls", [])
    except json.JSONDecodeError:
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

    for call in tool_calls[:8]:
        tool_id = call.get("toolId") or call.get("tool_id")
        if not tool_id:
            continue
        input_data = call.get("input") or {}
        result = await client.execute(tool_id, input_data, run_id)
        tool_results.append({"toolId": tool_id, "result": result})
        if result.get("status") == "pending_confirmation":
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
            SystemMessage(content="Summarize results for the user clearly and concisely."),
            HumanMessage(
                content=json.dumps(
                    {"request": message, "tool_results": tool_results},
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
