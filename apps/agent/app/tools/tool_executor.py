"""Parallel, batched capability execution with dependency waves."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from app.config import settings
from app.runtime import acquire_tool_slot
from app.tools.nest_client import NestCapabilityClient

# Lower tier runs before higher tier; same tier runs in parallel batches.
_TOOL_TIER: dict[str, int] = {
    "agents.definitions.create": 0,
    "agents.definitions.list": 1,
    "agents.schedules.create": 2,
    "agents.schedules.list": 3,
}

_DEFAULT_TIER = 50


def group_tool_waves(calls: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    tiers: dict[int, list[dict[str, Any]]] = {}
    for call in calls:
        tool_id = str(call.get("toolId") or call.get("tool_id") or "")
        tier = _TOOL_TIER.get(tool_id, _DEFAULT_TIER)
        tiers.setdefault(tier, []).append(call)
    return [tiers[key] for key in sorted(tiers.keys())]


def _normalize_call(call: dict[str, Any]) -> tuple[str, dict[str, Any]] | None:
    tool_id = call.get("toolId") or call.get("tool_id")
    if not tool_id:
        return None
    input_data = call.get("input") or {}
    if not isinstance(input_data, dict):
        input_data = {}
    return str(tool_id), input_data


def _result_ok(result: Any) -> tuple[bool, str | None]:
    if isinstance(result, dict) and result.get("status") == "error":
        return False, str(result.get("error") or result.get("message") or "Tool failed")
    if isinstance(result, dict) and result.get("status") in {"error", "failed"}:
        return False, str(result.get("message") or "Tool failed")
    return True, None


async def _run_single(
    client: NestCapabilityClient,
    tool_id: str,
    input_data: dict[str, Any],
    run_id: str,
    limit: asyncio.Semaphore,
) -> dict[str, Any]:
    async with limit:
        async with acquire_tool_slot():
            try:
                result = await client.execute(tool_id, input_data, run_id)
                ok, err = _result_ok(result)
                return {
                    "toolId": tool_id,
                    "input": input_data,
                    "ok": ok,
                    "result": result,
                    "error": err,
                }
            except Exception as exc:  # noqa: BLE001
                return {
                    "toolId": tool_id,
                    "input": input_data,
                    "ok": False,
                    "result": {"status": "error", "error": str(exc)},
                    "error": str(exc),
                }


async def execute_tools_stream(
    client: NestCapabilityClient,
    tool_calls: list[dict[str, Any]],
    run_id: str,
    executor_name: str,
) -> AsyncIterator[dict[str, Any]]:
    """Execute tools in dependency waves with parallel batches per wave."""
    max_tools = settings.max_tool_calls_per_run
    planned = [c for c in tool_calls if isinstance(c, dict)][:max_tools]
    waves = group_tool_waves(planned)

    if not planned:
        return

    tool_results: list[dict[str, Any]] = []
    steps: list[dict[str, Any]] = []
    pending_action_id: str | None = None
    parallel_limit = asyncio.Semaphore(settings.max_parallel_tool_calls)
    batch_size = max(1, settings.tool_batch_size)

    yield {
        "type": "status",
        "phase": "executing",
        "detail": f"Running {len(planned)} tool(s) across {len(waves)} wave(s)",
    }

    for wave_index, wave in enumerate(waves):
        normalized = [n for n in (_normalize_call(c) for c in wave) if n]
        if not normalized:
            continue

        for tool_id, input_data in normalized:
            yield {"type": "tool.start", "toolId": tool_id, "input": input_data}

        for batch_start in range(0, len(normalized), batch_size):
            batch = normalized[batch_start : batch_start + batch_size]

            if len(batch) > 1:
                async with acquire_tool_slot():
                    completed = await client.execute_batch(batch, run_id)
            else:
                tool_id, input_data = batch[0]
                completed = [
                    await _run_single(
                        client, tool_id, input_data, run_id, parallel_limit
                    )
                ]

            for item in completed:
                tool_id = str(item.get("toolId") or "")
                input_data = (
                    item.get("input") if isinstance(item.get("input"), dict) else {}
                )
                ok = bool(item.get("ok"))
                result = item.get("result")
                err = item.get("error")

                tool_results.append({"toolId": tool_id, "result": result})
                if isinstance(result, dict) and result.get("status") == "pending_confirmation":
                    pending_action_id = result.get("pendingActionId")

                yield {
                    "type": "tool.result",
                    "toolId": tool_id,
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
                        "wave": wave_index,
                    }
                )

    yield {
        "type": "_tool_executor_done",
        "toolResults": tool_results,
        "steps": steps,
        "pendingActionId": pending_action_id,
    }
