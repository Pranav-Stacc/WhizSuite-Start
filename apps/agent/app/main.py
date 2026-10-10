from __future__ import annotations

import json

import jwt
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.graphs.supervisor import run_supervisor_graph, run_supervisor_graph_stream

app = FastAPI(title="WhizSuite Agent Runtime", version="0.2.0")


class HistoryMessage(BaseModel):
    role: str
    content: str


class RunRequest(BaseModel):
    session_id: str = Field(alias="session_id")
    run_id: str = Field(alias="run_id")
    message: str
    multi_agent: bool = Field(default=True, alias="multi_agent")
    system_prompt: str | None = Field(default=None, alias="system_prompt")
    sub_agents: list[dict[str, str]] | None = Field(default=None, alias="sub_agents")
    tool_ids: list[str] | None = Field(default=None, alias="tool_ids")
    history: list[HistoryMessage] | None = None

    class Config:
        populate_by_name = True


def decode_run_token(token: str) -> dict:
    try:
        # Prefer verifying when the shared secret is configured.
        secret = (settings.jwt_access_secret or "").strip()
        if secret:
            payload = jwt.decode(token, secret, algorithms=["HS256"])
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
        if payload.get("type") != "agent_run":
            raise HTTPException(status_code=401, detail="Invalid agent token type")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


def _auth_context(authorization: str | None) -> tuple[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    claims = decode_run_token(token)
    org_id = claims.get("organizationId")
    if not org_id:
        raise HTTPException(status_code=401, detail="Token missing organizationId")
    return token, str(org_id)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/run")
async def run_agent(
    body: RunRequest,
    authorization: str | None = Header(default=None),
):
    token, org_id = _auth_context(authorization)
    history = [{"role": h.role, "content": h.content} for h in body.history or []]

    try:
        result = await run_supervisor_graph(
            message=body.message,
            run_token=token,
            organization_id=org_id,
            run_id=body.run_id,
            multi_agent=body.multi_agent,
            system_prompt=body.system_prompt,
            sub_agents=body.sub_agents,
            tool_ids=body.tool_ids,
            history=history,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent graph failed: {exc}") from exc


@app.post("/v1/run/stream")
async def run_agent_stream(
    body: RunRequest,
    authorization: str | None = Header(default=None),
):
    token, org_id = _auth_context(authorization)
    history = [{"role": h.role, "content": h.content} for h in body.history or []]

    async def event_gen():
        try:
            async for event in run_supervisor_graph_stream(
                message=body.message,
                run_token=token,
                organization_id=org_id,
                run_id=body.run_id,
                multi_agent=body.multi_agent,
                system_prompt=body.system_prompt,
                sub_agents=body.sub_agents,
                tool_ids=body.tool_ids,
                history=history,
            ):
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as exc:  # noqa: BLE001
            err = {"type": "error", "message": f"Agent graph failed: {exc}"}
            yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
