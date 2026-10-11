from __future__ import annotations



import json

import logging

from contextlib import asynccontextmanager



import jwt

from fastapi import FastAPI, Header, HTTPException

from fastapi.responses import JSONResponse, StreamingResponse

from pydantic import BaseModel, Field



from app.config import settings

from app.graphs.react_agent import run_react_agent, run_react_agent_stream

from app.runtime import acquire_run_slot, init_runtime, shutdown_runtime



logger = logging.getLogger(__name__)





class HistoryMessage(BaseModel):

    role: str

    content: str





class RunRequest(BaseModel):

    session_id: str = Field(alias="session_id")

    run_id: str = Field(alias="run_id")

    message: str

    multi_agent: bool = Field(default=True, alias="multi_agent")

    system_prompt: str | None = Field(default=None, alias="system_prompt")

    summary_prompt: str | None = Field(default=None, alias="summary_prompt")

    sub_agents: list[dict[str, str]] | None = Field(default=None, alias="sub_agents")

    tool_ids: list[str] | None = Field(default=None, alias="tool_ids")

    history: list[HistoryMessage] | None = None



    class Config:

        populate_by_name = True





def decode_run_token(token: str) -> dict:

    try:

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





@asynccontextmanager

async def lifespan(_: FastAPI):

    init_runtime()

    logger.info(

        "Agent runtime ready (workers=%s runs=%s parallel_tools=%s batch=%s)",

        settings.uvicorn_workers,

        settings.max_concurrent_runs,

        settings.max_parallel_tool_calls,

        settings.tool_batch_size,

    )

    try:

        yield

    finally:

        await shutdown_runtime()





app = FastAPI(title="WhizSuite Agent Runtime", version="0.2.0", lifespan=lifespan)





@app.get("/health")

async def health():

    return {"status": "ok"}





async def _run_graph(body: RunRequest, token: str, org_id: str):

    history = [{"role": h.role, "content": h.content} for h in body.history or []]

    async with acquire_run_slot():

        return await run_react_agent(

            message=body.message,

            run_token=token,

            organization_id=org_id,

            run_id=body.run_id,

            multi_agent=body.multi_agent,

            system_prompt=body.system_prompt,

            summary_prompt=body.summary_prompt,

            sub_agents=body.sub_agents,

            tool_ids=body.tool_ids,

            history=history,

        )





async def _stream_graph(body: RunRequest, token: str, org_id: str):

    history = [{"role": h.role, "content": h.content} for h in body.history or []]

    async with acquire_run_slot():

        async for event in run_react_agent_stream(

            message=body.message,

            run_token=token,

            organization_id=org_id,

            run_id=body.run_id,

            multi_agent=body.multi_agent,

            system_prompt=body.system_prompt,

            summary_prompt=body.summary_prompt,

            sub_agents=body.sub_agents,

            tool_ids=body.tool_ids,

            history=history,

        ):

            yield event





@app.post("/v1/run")

async def run_agent(

    body: RunRequest,

    authorization: str | None = Header(default=None),

):

    token, org_id = _auth_context(authorization)

    try:

        return await _run_graph(body, token, org_id)

    except RuntimeError as exc:

        if str(exc) == "agent_capacity_exceeded":

            return JSONResponse(

                status_code=503,

                content={"detail": "Agent capacity exceeded. Retry shortly."},

                headers={"Retry-After": "15"},

            )

        raise

    except Exception as exc:

        logger.exception("Agent graph failed run_id=%s org=%s", body.run_id, org_id)

        raise HTTPException(
            status_code=502,
            detail="Agent graph failed. Please try again in a moment.",
        ) from exc





@app.post("/v1/run/stream")

async def run_agent_stream(

    body: RunRequest,

    authorization: str | None = Header(default=None),

):

    token, org_id = _auth_context(authorization)



    async def event_gen():

        try:

            async for event in _stream_graph(body, token, org_id):

                yield f"data: {json.dumps(event, default=str)}\n\n"

        except RuntimeError as exc:

            if str(exc) == "agent_capacity_exceeded":

                err = {

                    "type": "error",

                    "message": "Whiz is busy right now. Please retry in a moment.",

                    "code": "capacity_exceeded",

                }

                yield f"data: {json.dumps(err)}\n\n"

                return

            err = {
                "type": "error",
                "message": "Agent graph failed. Please try again in a moment.",
            }

            yield f"data: {json.dumps(err)}\n\n"

        except Exception as exc:  # noqa: BLE001

            logger.exception("Agent stream failed run_id=%s org=%s", body.run_id, org_id)

            err = {
                "type": "error",
                "message": "Agent graph failed. Please try again in a moment.",
            }

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

