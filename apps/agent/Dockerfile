# Build context: apps/agent
# public.ecr.aws avoids Docker Hub rate limits in CI
FROM public.ecr.aws/docker/library/python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN useradd --create-home --uid 10001 appuser

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app ./app

USER appuser
EXPOSE 8000
# Scale throughput with AGENT_UVICORN_WORKERS × replica count; each worker has its own concurrency cap.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${AGENT_UVICORN_WORKERS:-2}"]
