from __future__ import annotations

import httpx
from typing import Any


class NestCapabilityClient:
    """Calls Nest capability + MCP endpoints with the user's agent run token."""

    def __init__(self, base_url: str, run_token: str, organization_id: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.run_token = run_token
        self.organization_id = organization_id

    async def list_tools(self) -> list[dict[str, Any]]:
        url = f"{self.base_url}/v1/organizations/{self.organization_id}/capabilities"
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.get(url, headers=self._headers())
            res.raise_for_status()
            return res.json()

    async def execute(self, tool_id: str, input: dict[str, Any], run_id: str) -> dict[str, Any]:
        url = f"{self.base_url}/v1/organizations/{self.organization_id}/mcp"
        payload = {
            "jsonrpc": "2.0",
            "id": run_id,
            "method": "tools/call",
            "params": {"name": tool_id, "arguments": input, "runId": run_id},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            res = await client.post(url, json=payload, headers=self._headers())
            res.raise_for_status()
            body = res.json()
            if "error" in body:
                raise RuntimeError(str(body["error"]))
            content = body.get("result", {}).get("content", [])
            if content and content[0].get("type") == "text":
                import json

                return json.loads(content[0]["text"])
            return body.get("result", {})

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.run_token}",
            "Content-Type": "application/json",
        }
