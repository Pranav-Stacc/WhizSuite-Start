from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.message_attachments import build_human_message, parse_attachment_refs


def test_parse_attachment_uri() -> None:
    asset_id = "a0000000-0000-4000-8000-000000000001"
    message = f"create invoice\n\n[invoice.pdf](attachment://{asset_id})"
    text, refs = parse_attachment_refs(message)
    assert "create invoice" in text
    assert len(refs) == 1
    assert refs[0].label == "invoice.pdf"
    assert refs[0].target == f"attachment://{asset_id}"


@pytest.mark.asyncio
async def test_build_human_message_inlines_pdf() -> None:
    asset_id = "b0000000-0000-4000-8000-000000000002"
    message = f"summarize\n\n[doc.pdf](attachment://{asset_id})"
    mock_client = AsyncMock()
    mock_client.execute.return_value = {"downloadUrl": "https://cdn.example/doc.pdf"}

    pdf_bytes = b"%PDF-1.4 test"
    with patch(
        "app.message_attachments._fetch_bytes",
        AsyncMock(return_value=(pdf_bytes, "application/pdf")),
    ):
        human = await build_human_message(message, mock_client)

    mock_client.execute.assert_called_once_with(
        "media.download_url",
        {"assetId": asset_id},
        "attachment-fetch",
    )
    assert isinstance(human.content, list)
    file_blocks = [b for b in human.content if b.get("type") == "file"]
    assert len(file_blocks) == 1
    assert file_blocks[0]["mime_type"] == "application/pdf"
