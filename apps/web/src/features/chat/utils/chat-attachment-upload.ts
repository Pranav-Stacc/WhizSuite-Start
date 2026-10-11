import type { ChatAttachmentKind } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import {
  assetDownloadUrlAction,
  completeUploadAction,
  requestUploadAction,
} from '@/features/media/actions/media.actions';
import { uploadToStorage } from '@/features/media/utils/upload-to-storage';

const FALLBACK_MIME = 'application/octet-stream';

export const CHAT_ATTACHMENT_ACCEPT = 'image/*,application/pdf,.pdf';
const MAX_BYTES = 25 * 1024 * 1024;

export interface ChatAttachmentReady {
  name: string;
  mimeType: string;
  url: string;
  assetId: string;
  sizeBytes: number;
  kind: ChatAttachmentKind;
}

export function isChatAttachmentFile(file: File): boolean {
  const type = file.type || FALLBACK_MIME;
  if (type.startsWith('image/')) return true;
  return type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function attachmentKind(file: File): ChatAttachmentKind {
  const type = file.type || FALLBACK_MIME;
  return type.startsWith('image/') ? 'IMAGE' : 'FILE';
}

export async function uploadChatAttachment(file: File): Promise<ChatAttachmentReady> {
  if (!isChatAttachmentFile(file)) {
    throw new Error(t('chat.attach.unsupported'));
  }
  if (file.size > MAX_BYTES) {
    throw new Error(t('chat.attach.tooLarge'));
  }

  const ticket = await requestUploadAction({
    filename: file.name,
    mimeType: file.type || FALLBACK_MIME,
    sizeBytes: file.size,
  });
  if (!ticket.ok || !ticket.data) throw new Error(ticket.message || t('toast.failed'));

  await uploadToStorage(ticket.data.uploadUrl, file, ticket.data.headers, () => undefined);
  const done = await completeUploadAction(ticket.data.assetId);
  if (!done.ok) throw new Error(done.message);

  const urlResult = await assetDownloadUrlAction(ticket.data.assetId, 'inline');
  if (!urlResult.ok || !urlResult.data?.url) throw new Error(urlResult.message || t('toast.failed'));

  const mimeType = file.type || FALLBACK_MIME;
  return {
    assetId: ticket.data.assetId,
    name: file.name,
    mimeType,
    url: urlResult.data.url,
    sizeBytes: file.size,
    kind: attachmentKind(file),
  };
}

export function toChatAttachmentPayload(ready: ChatAttachmentReady) {
  return {
    kind: ready.kind,
    assetId: ready.assetId,
    fileName: ready.name,
    mimeType: ready.mimeType,
    sizeBytes: ready.sizeBytes,
  };
}
