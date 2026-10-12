"""Resolve Whiz chat attachments (PDF/images) for Gemini multimodal input."""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlparse

import httpx
from langchain_core.messages import HumanMessage

from app.runtime import http_client
from app.tools.nest_client import NestCapabilityClient

ATTACHMENT_URI = re.compile(
    r"^attachment://(?P<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$",
    re.I,
)
MARKDOWN_LINK = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)")
UUID_PATTERN = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.I,
)

MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
MAX_ATTACHMENTS = 5

SUPPORTED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


@dataclass(frozen=True)
class AttachmentRef:
    label: str
    target: str
    is_image: bool


def _guess_mime(label: str, content_type: str | None) -> str | None:
    if content_type:
        mime = content_type.split(";")[0].strip().lower()
        if mime in SUPPORTED_MIME or mime.startswith("image/"):
            return mime
    lower = label.lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".gif"):
        return "image/gif"
    return None


def parse_attachment_refs(message: str) -> tuple[str, list[AttachmentRef]]:
    """Extract attachment markdown and return cleaned user text + refs."""
    refs: list[AttachmentRef] = []
    spans: list[tuple[int, int]] = []

    for match in MARKDOWN_LINK.finditer(message):
        if match.group(1) is not None:
            label = match.group(1)
            target = unquote(match.group(2).strip())
            is_image = True
        else:
            label = match.group(3) or "attachment"
            target = unquote(match.group(4).strip())
            is_image = False

        if not target or target.startswith("#"):
            continue
        if not (
            ATTACHMENT_URI.match(target)
            or target.startswith("http://")
            or target.startswith("https://")
        ):
            continue

        refs.append(AttachmentRef(label=label or "attachment", target=target, is_image=is_image))
        spans.append(match.span())

    if not refs:
        return message, []

    cleaned_parts: list[str] = []
    cursor = 0
    for start, end in spans:
        cleaned_parts.append(message[cursor:start])
        cursor = end
    cleaned_parts.append(message[cursor:])
    cleaned = re.sub(r"\n{3,}", "\n\n", "".join(cleaned_parts)).strip()
    return cleaned, refs[:MAX_ATTACHMENTS]


def _asset_id_from_target(target: str) -> str | None:
    uri = ATTACHMENT_URI.match(target)
    if uri:
        return uri.group("id")
    match = UUID_PATTERN.search(target)
    return match.group(0) if match else None


async def _download_url_for_asset(
    client: NestCapabilityClient,
    asset_id: str,
) -> str | None:
    try:
        result = await client.execute(
            "media.download_url",
            {"assetId": asset_id},
            "attachment-fetch",
        )
    except Exception:
        return None
    if not isinstance(result, dict):
        return None
    url = result.get("url") or result.get("downloadUrl")
    return str(url) if url else None


async def _fetch_bytes(url: str) -> tuple[bytes, str | None]:
    res = await http_client().get(url, follow_redirects=True)
    res.raise_for_status()
    content_type = res.headers.get("content-type")
    return res.content, content_type


def _file_block(data: bytes, mime_type: str) -> dict[str, Any]:
    encoded = base64.b64encode(data).decode("ascii")
    if mime_type.startswith("image/"):
        return {
            "type": "image",
            "base64": encoded,
            "mime_type": mime_type,
        }
    return {
        "type": "file",
        "base64": encoded,
        "mime_type": mime_type,
    }


async def _resolve_ref(
    client: NestCapabilityClient,
    ref: AttachmentRef,
) -> dict[str, Any] | None:
    asset_id = _asset_id_from_target(ref.target)
    url = ref.target
    if asset_id:
        signed = await _download_url_for_asset(client, asset_id)
        if signed:
            url = signed

    if not url.startswith("http://") and not url.startswith("https://"):
        return None

    try:
        data, content_type = await _fetch_bytes(url)
    except (httpx.HTTPError, OSError):
        return None

    if len(data) > MAX_ATTACHMENT_BYTES:
        return {
            "type": "text",
            "text": f"(Attachment {ref.label} is too large to analyze — max 20 MB.)",
        }

    mime = _guess_mime(ref.label, content_type)
    if not mime:
        return {
            "type": "text",
            "text": f"(Attachment {ref.label} has an unsupported file type.)",
        }

    return _file_block(data, mime)


async def build_human_message(
    message: str,
    client: NestCapabilityClient,
) -> HumanMessage:
    """Build a Gemini-ready HumanMessage with inline PDF/image bytes when attached."""
    text, refs = parse_attachment_refs(message)
    if not refs:
        return HumanMessage(content=message)

    blocks: list[Any] = []
    if text.strip():
        blocks.append({"type": "text", "text": text.strip()})

    for ref in refs:
        note = f"Attached file: {ref.label}"
        blocks.append({"type": "text", "text": note})
        resolved = await _resolve_ref(client, ref)
        if resolved:
            blocks.append(resolved)

    if len(blocks) == 1 and blocks[0].get("type") == "text":
        return HumanMessage(content=str(blocks[0]["text"]))

    return HumanMessage(content=blocks)
