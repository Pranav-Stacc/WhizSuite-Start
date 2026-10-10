"""Integration-style tests for the ReAct agent stream (mocked LLM + MCP)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

pytest.importorskip("langchain_core")
from langchain_core.messages import AIMessage

from app.graphs.react_agent import run_react_agent_stream


class _FakeBoundModel:
    def __init__(self, turns: list[AIMessage]) -> None:
        self._turns = list(turns)
        self.astream_calls = 0

    async def astream(self, _messages: list[Any]):
        self.astream_calls += 1
        if not self._turns:
            return
        msg = self._turns.pop(0)
        yield msg

    async def ainvoke(self, _messages: list[Any]) -> AIMessage:
        if self._turns:
            return self._turns.pop(0)
        return AIMessage(content="Done.")


class _FakeChatModel:
    def __init__(self, turns: list[AIMessage]) -> None:
        self._turns = turns
        self.bound: _FakeBoundModel | None = None
        self.summary: _FakeBoundModel | None = None

    def bind_tools(self, _tools: list[dict[str, Any]]) -> _FakeBoundModel:
        self.bound = _FakeBoundModel(self._turns)
        return self.bound

    async def astream(self, _messages: list[Any]):
        self.summary = _FakeBoundModel([])
        async for chunk in self.summary.astream(_messages):
            yield chunk


@pytest.mark.asyncio
async def test_streams_tool_start_result_then_answer() -> None:
    tool_turn = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "clients.list",
                "args": {"limit": 5},
                "id": "call-1",
                "type": "tool_call",
            }
        ],
    )
    answer_turn = AIMessage(content="Found 2 clients.")
    fake = _FakeChatModel([tool_turn, answer_turn])

    mock_client = AsyncMock()
    mock_client.list_tools.return_value = [
        {
            "id": "clients.list",
            "name": "List clients",
            "description": "List clients",
            "inputSchema": {"type": "object", "properties": {"limit": {"type": "integer"}}},
        }
    ]
    mock_client.execute.return_value = {"status": "ok", "output": {"items": []}}

    events: list[dict[str, Any]] = []

    with (
        patch("app.graphs.react_agent._load_tools", AsyncMock(return_value=mock_client.list_tools.return_value)),
        patch("app.graphs.react_agent.build_chat_model", return_value=fake),
        patch("app.graphs.react_agent.NestCapabilityClient", return_value=mock_client),
    ):
        async for event in run_react_agent_stream(
            message="list clients",
            run_token="token",
            organization_id="org-1",
            run_id="run-1",
            multi_agent=False,
            system_prompt=None,
            sub_agents=None,
            tool_ids=None,
        ):
            events.append(event)

    types = [e["type"] for e in events]
    assert "tool.start" in types
    assert "tool.result" in types
    assert "summary.delta" in types
    assert events[-1]["type"] == "done"

    tool_start = next(e for e in events if e["type"] == "tool.start")
    assert tool_start["toolId"] == "clients.list"
    assert tool_start["input"] == {"limit": 5}

    tool_result = next(e for e in events if e["type"] == "tool.result")
    assert tool_result["ok"] is True


@pytest.mark.asyncio
async def test_direct_answer_streams_without_summary_model() -> None:
    fake = _FakeChatModel([AIMessage(content="Hello there.")])

    mock_client = AsyncMock()
    mock_client.list_tools.return_value = []

    events: list[dict[str, Any]] = []

    with (
        patch("app.graphs.react_agent._load_tools", AsyncMock(return_value=[])),
        patch("app.graphs.react_agent.build_chat_model", return_value=fake),
        patch("app.graphs.react_agent.NestCapabilityClient", return_value=mock_client),
    ):
        async for event in run_react_agent_stream(
            message="hi",
            run_token="token",
            organization_id="org-1",
            run_id="run-2",
            multi_agent=False,
            system_prompt=None,
            sub_agents=None,
            tool_ids=None,
        ):
            events.append(event)

    assert any(e["type"] == "summary.delta" and "Hello" in e.get("text", "") for e in events)
    assert events[-1]["response"] == "Hello there."
    assert fake.bound is not None
    assert fake.bound.astream_calls == 1
    assert fake.summary is None
