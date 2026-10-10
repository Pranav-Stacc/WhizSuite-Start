"""Convert MCP tool descriptors to provider-native tool definitions for bind_tools."""

from __future__ import annotations

from typing import Any


def to_openai_tool(tool: dict[str, Any]) -> dict[str, Any]:
    """OpenAI / Gemini / Anthropic function tool shape for LangChain bind_tools."""
    tool_id = str(tool.get("id") or tool.get("name") or "").strip()
    if not tool_id:
        raise ValueError("Tool missing id")
    schema = tool.get("inputSchema")
    if not isinstance(schema, dict) or not schema:
        schema = {"type": "object", "properties": {}}
    description = str(tool.get("description") or tool.get("name") or tool_id)
    return {
        "type": "function",
        "function": {
            "name": tool_id,
            "description": description[:2000],
            "parameters": schema,
        },
    }


def to_openai_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [to_openai_tool(t) for t in tools if t.get("id") or t.get("name")]
