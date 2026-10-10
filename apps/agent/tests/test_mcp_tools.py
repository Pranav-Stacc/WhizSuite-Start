"""Unit tests for MCP → OpenAI tool conversion."""

from app.tools.mcp_tools import to_openai_tool, to_openai_tools


def test_to_openai_tool_maps_schema() -> None:
    row = {
        "id": "clients.create",
        "description": "Create a client",
        "inputSchema": {
            "type": "object",
            "properties": {"displayName": {"type": "string"}},
            "required": ["displayName"],
        },
    }
    out = to_openai_tool(row)
    assert out["type"] == "function"
    assert out["function"]["name"] == "clients.create"
    assert out["function"]["parameters"]["required"] == ["displayName"]


def test_to_openai_tools_skips_invalid() -> None:
    tools = to_openai_tools([{"description": "no id"}, {"id": "ping", "inputSchema": {}}])
    assert len(tools) == 1
    assert tools[0]["function"]["name"] == "ping"
