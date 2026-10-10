from __future__ import annotations

import json
from typing import Any

import httpx

from app.runtime import http_client


class NestCapabilityClient:
    """Calls Nest capability + MCP endpoints with the user's agent run token."""

    def __init__(self, base_url: str, run_token: str, organization_id: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.run_token = run_token
        self.organization_id = organization_id
        self._mcp_initialized = False

    async def _ensure_mcp_session(self) -> None:
        """MCP handshake before tools/list or tools/call (JSON-RPC 2024-11-05)."""
        if self._mcp_initialized:
            return
        await self._mcp_request(
            "initialize",
            request_id="init",
            params={
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "whizsuite-agent", "version": "1.0.0"},
            },
        )
        self._mcp_initialized = True

    async def list_tools(self) -> list[dict[str, Any]]:
        """Discover tools via MCP tools/list; fall back to REST capabilities."""
        try:
            await self._ensure_mcp_session()
            body = await self._mcp_request("tools/list", request_id="catalog")
            tools = body.get("result", {}).get("tools", [])
            if isinstance(tools, list) and tools:
                return [self._normalize_tool_descriptor(row) for row in tools]
        except Exception:
            pass

        url = f"{self.base_url}/v1/organizations/{self.organization_id}/capabilities"
        res = await http_client().get(url, headers=self._headers())
        self._raise_for_status(res)
        payload = res.json()
        if not isinstance(payload, list):
            return []
        return [self._normalize_tool_descriptor(row) for row in payload]

    async def _mcp_request(
        self,
        method: str,
        *,
        request_id: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if method in {"tools/list", "tools/call", "tools/call_batch"}:
            await self._ensure_mcp_session()
        url = f"{self.base_url}/v1/organizations/{self.organization_id}/mcp"
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
        }
        if params is not None:
            payload["params"] = params
        res = await http_client().post(url, json=payload, headers=self._headers())
        self._raise_for_status(res)
        body = res.json()
        if not isinstance(body, dict):
            raise RuntimeError("Invalid MCP response")
        if "error" in body:
            err = body["error"]
            message = err.get("message") if isinstance(err, dict) else str(err)
            raise RuntimeError(message or "MCP request failed")
        return body

    @staticmethod
    def _normalize_tool_descriptor(row: Any) -> dict[str, Any]:
        """Map MCP tools/list rows and REST descriptors to planner shape."""
        if not isinstance(row, dict):
            return {}
        tool_id = row.get("id") or row.get("name")
        if not tool_id:
            return {}
        annotations = row.get("annotations") if isinstance(row.get("annotations"), dict) else {}
        return {
            "id": str(tool_id),
            "name": str(annotations.get("displayName") or row.get("name") or tool_id),
            "module": str(annotations.get("module") or row.get("module") or ""),
            "description": str(row.get("description") or ""),
            "riskTier": str(annotations.get("riskTier") or row.get("riskTier") or ""),
            "requiresConfirmation": bool(
                annotations.get("requiresConfirmation", row.get("requiresConfirmation", False))
            ),
            "inputSchema": row.get("inputSchema") if isinstance(row.get("inputSchema"), dict) else {},
        }

    async def execute(self, tool_id: str, input: dict[str, Any], run_id: str) -> dict[str, Any]:
        rows = await self.execute_batch([(tool_id, input)], run_id)
        if not rows:
            raise RuntimeError("Empty tool response")
        row = rows[0]
        if not row.get("ok"):
            raise RuntimeError(str(row.get("error") or "Tool failed"))
        result = row.get("result")
        if isinstance(result, dict):
            return result
        return {}

    async def execute_batch(
        self,
        calls: list[tuple[str, dict[str, Any]]],
        run_id: str,
    ) -> list[dict[str, Any]]:
        if not calls:
            return []

        if len(calls) == 1:
            tool_id, input_data = calls[0]
            try:
                body = await self._mcp_request(
                    "tools/call",
                    request_id=run_id,
                    params={
                        "name": tool_id,
                        "arguments": input_data,
                        "runId": run_id,
                    },
                )
            except Exception as exc:  # noqa: BLE001
                return [
                    {
                        "toolId": tool_id,
                        "input": input_data,
                        "ok": False,
                        "result": None,
                        "error": str(exc),
                    }
                ]
            mcp_result = body.get("result", {})
            content = mcp_result.get("content", []) if isinstance(mcp_result, dict) else []
            if content and content[0].get("type") == "text":
                result = json.loads(content[0]["text"])
            else:
                result = mcp_result if isinstance(mcp_result, dict) else {}
            is_error = bool(isinstance(mcp_result, dict) and mcp_result.get("isError"))
            ok = not is_error and not (
                isinstance(result, dict) and result.get("status") in {"error", "failed"}
            )
            err = None
            if isinstance(result, dict) and result.get("status") == "error":
                err = str(result.get("error") or result.get("message") or "Tool failed")
                ok = False
            return [
                {
                    "toolId": tool_id,
                    "input": input_data,
                    "ok": ok,
                    "result": result,
                    "error": err,
                }
            ]

        body = await self._mcp_request(
            "tools/call_batch",
            request_id=run_id,
            params={
                "runId": run_id,
                "calls": [
                    {"name": tool_id, "arguments": input_data}
                    for tool_id, input_data in calls
                ],
            },
        )
        if "error" in body:
            return [
                {
                    "toolId": tool_id,
                    "input": input_data,
                    "ok": False,
                    "result": None,
                    "error": str(body["error"]),
                }
                for tool_id, input_data in calls
            ]
        results = body.get("result", {}).get("results", [])
        if not isinstance(results, list):
            return []
        normalized: list[dict[str, Any]] = []
        for index, row in enumerate(results):
            tool_id, input_data = calls[index] if index < len(calls) else ("", {})
            if not isinstance(row, dict):
                normalized.append(
                    {
                        "toolId": tool_id,
                        "input": input_data,
                        "ok": False,
                        "result": None,
                        "error": "Invalid batch row",
                    }
                )
                continue
            normalized.append(
                {
                    "toolId": str(row.get("toolId") or tool_id),
                    "input": input_data,
                    "ok": bool(row.get("ok")),
                    "result": row.get("result"),
                    "error": row.get("error"),
                }
            )
        return normalized

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
