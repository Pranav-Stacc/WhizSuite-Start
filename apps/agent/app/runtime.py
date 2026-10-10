"""Process-wide HTTP pooling and run concurrency limits for horizontal scale."""

from __future__ import annotations

import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import Any

import httpx

from app.config import settings

_http_client: httpx.AsyncClient | None = None
_run_semaphore: asyncio.Semaphore | None = None
_tool_semaphore: asyncio.Semaphore | None = None


class ToolCatalogCache:
    """Bounded per-org tool catalog cache (safe across many tenants on one worker)."""

    def __init__(self, max_orgs: int, ttl_sec: float) -> None:
        self._max_orgs = max_orgs
        self._ttl_sec = ttl_sec
        self._entries: OrderedDict[str, tuple[float, list[dict[str, Any]]]] = OrderedDict()

    def get(self, organization_id: str) -> list[dict[str, Any]] | None:
        import time

        entry = self._entries.get(organization_id)
        if entry is None:
            return None
        cached_at, tools = entry
        if time.time() - cached_at >= self._ttl_sec:
            self._entries.pop(organization_id, None)
            return None
        self._entries.move_to_end(organization_id)
        return tools

    def set(self, organization_id: str, tools: list[dict[str, Any]]) -> None:
        import time

        self._entries[organization_id] = (time.time(), tools)
        self._entries.move_to_end(organization_id)
        while len(self._entries) > self._max_orgs:
            self._entries.popitem(last=False)


_tool_cache: ToolCatalogCache | None = None


def init_runtime() -> None:
    global _http_client, _run_semaphore, _tool_semaphore, _tool_cache
    limits = httpx.Limits(
        max_connections=settings.http_max_connections,
        max_keepalive_connections=settings.http_max_keepalive,
    )
    _http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(settings.request_timeout_seconds),
        limits=limits,
    )
    _run_semaphore = asyncio.Semaphore(settings.max_concurrent_runs)
    _tool_semaphore = asyncio.Semaphore(settings.max_concurrent_tool_calls)
    _tool_cache = ToolCatalogCache(settings.tool_cache_max_orgs, settings.tool_cache_ttl_sec)


async def shutdown_runtime() -> None:
    global _http_client, _run_semaphore, _tool_semaphore, _tool_cache
    if _http_client is not None:
        await _http_client.aclose()
    _http_client = None
    _run_semaphore = None
    _tool_semaphore = None
    _tool_cache = None


def http_client() -> httpx.AsyncClient:
    if _http_client is None:
        raise RuntimeError("Agent runtime is not initialized")
    return _http_client


def tool_cache() -> ToolCatalogCache:
    if _tool_cache is None:
        raise RuntimeError("Agent runtime is not initialized")
    return _tool_cache


@asynccontextmanager
async def acquire_tool_slot():
    """Limits concurrent capability HTTP calls per worker across all active runs."""
    if _tool_semaphore is None:
        yield
        return
    await _tool_semaphore.acquire()
    try:
        yield
    finally:
        _tool_semaphore.release()


@asynccontextmanager
async def acquire_run_slot():
    """Limits in-flight agent graphs per worker to protect memory and upstream APIs."""
    if _run_semaphore is None:
        yield
        return
    try:
        await asyncio.wait_for(_run_semaphore.acquire(), timeout=settings.run_slot_wait_seconds)
    except TimeoutError:
        raise RuntimeError("agent_capacity_exceeded") from None
    try:
        yield
    finally:
        _run_semaphore.release()
