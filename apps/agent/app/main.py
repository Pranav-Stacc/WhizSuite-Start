from __future__ import annotations

import jwt
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.graphs.supervisor import run_supervisor_graph

app = FastAPI(title="WhizSuite Agent Runtime", version="0.1.0")


class RunRequest(BaseModel):
    session_id: str = Field(alias="session_id")
    run_id: str = Field(alias="run_id")
    message: str
    multi_agent: bool = Field(default=True, alias="multi_agent")
    system_prompt: str | None = Field(default=None, alias="system_prompt")
    sub_agents: list[dict[str, str]] | None = Field(default=None, alias="sub_agents")
    tool_ids: list[str] | None = Field(default=None, alias="tool_ids")

    class Config:
        populate_by_name = True


def decode_run_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        if payload.get("type") != "agent_run":
            raise HTTPException(status_code=401, detail="Invalid agent token type")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/run")
async def run_agent(
    body: RunRequest,
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    claims = decode_run_token(token)
    org_id = claims.get("organizationId")
    if not org_id:
        raise HTTPException(status_code=401, detail="Token missing organizationId")

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
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent graph failed: {exc}") from exc
