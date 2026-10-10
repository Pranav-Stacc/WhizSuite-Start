from __future__ import annotations

import json
from typing import Any

import httpx


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
            self._raise_for_status(res)
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
            self._raise_for_status(res)
            body = res.json()
            if "error" in body:
                raise RuntimeError(str(body["error"]))
            content = body.get("result", {}).get("content", [])
            if content and content[0].get("type") == "text":
                return json.loads(content[0]["text"])
            return body.get("result", {})

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.run_token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _raise_for_status(res: httpx.Response) -> None:
        if res.is_success:
            return
        detail = ""
        try:
            body = res.json()
            if isinstance(body, dict):
                detail = str(
                    body.get("detail")
                    or body.get("message")
                    or body.get("title")
                    or body.get("error")
                    or ""
                )
                if not detail and "error" in body and isinstance(body["error"], dict):
                    detail = str(body["error"].get("message") or body["error"])
        except Exception:
            detail = (res.text or "")[:500]
        suffix = f": {detail}" if detail else ""
        raise httpx.HTTPStatusError(
            f"{res.status_code} {res.reason_phrase} for {res.request.url}{suffix}",
            request=res.request,
            response=res,
        )
