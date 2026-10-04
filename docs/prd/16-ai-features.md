# 16 — AI Features

AI is an accelerator layered on top of solid workflows (Phase 4+), never a dependency for core flows.

## 16.1 Architecture
- `ai` module behind an `LlmProviderPort` (OpenAI / Anthropic / Gemini / self-hosted — config-selected per feature); embeddings via `EmbeddingPort`; vector store via **pgvector** (org-scoped, RLS).
- Prompt templates versioned in DB/config, not code.
- **Tenant isolation:** context only from the requesting org and the user's authorized scope (authz filter applied before retrieval). No cross-tenant training; provider "no data retention" options enabled.
- Usage metering per org (tokens, requests) → entitlements/credits ([19](19-saas-billing.md)).
- Every AI output is a **suggestion** requiring human accept; generated content flagged `ai_assisted` (audit + transparency).
- PII redaction option before sending to providers; per-org AI on/off and per-feature toggles.

## 16.2 Content Creation
- **Caption generator** using brand kit voice, pillars, banned words, CTAs, platform limits; variants per platform; tone adjust (formal/playful), shorten/expand, translate (Indian languages + global).
- **Hashtag suggestions** (brand sets + relevance).
- **Content ideas** per pillar & calendar gaps ("You have 3 empty slots in week 2 for Nike — suggest ideas").
- **Monthly content plan draft** from brief + pillars + key dates → draft content items in calendar (status Draft).
- Alt-text generation for images (accessibility).
- Repurposing: long video → suggested clip timestamps; blog → carousel outline.

## 16.3 Agency Intelligence
- **AI Project Manager Q&A:** "What projects are at risk?" → answers grounded in project health, approval delays, capacity data (tool-calling into module query ports with user's permissions).
- **Client Brief Analyzer:** extract project type, deliverables, platforms, timeline, estimated effort, risks → draft project + tasks for review.
- **Client health explanations** & churn risk narrative.
- **Report executive summary** drafting from analytics.
- **Meeting assistant** (Phase 5): transcription (integrations with Meet/Zoom recordings), summary, decisions, action items → suggested tasks with assignee/due date.

## 16.4 Engagement
- Inbox reply suggestions in brand voice; sentiment & intent classification; spam detection; crisis detection.

## 16.5 Search
- Semantic search across content, files (OCR/transcripts), comments, knowledge base ("Find the latest approved Nike Instagram creative").

## 16.6 Creative QA (Phase 5)
Pre-publish checks: brand color/logo presence, text-on-image ratio, typo/grammar check, banned word check, platform policy hints.

## 16.7 Acceptance Criteria
- AI never returns data outside the user's authorized scope (retrieval tests with scoped users).
- All AI features can be disabled per org; core workflows function fully without AI.
- Token usage visible to org admins and enforced against plan credits.
