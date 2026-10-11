import { t } from '@/shared/i18n/t';
import {
  assetDownloadUrlAction,
  completeUploadAction,
  requestUploadAction,
} from '@/features/media/actions/media.actions';
import { uploadToStorage } from '@/features/media/utils/upload-to-storage';

const FALLBACK_MIME = 'application/octet-stream';

export const AGENT_ATTACHMENT_ACCEPT = 'image/*,application/pdf';
const MAX_BYTES = 25 * 1024 * 1024;

export interface AgentAttachmentReady {
  name: string;
  mimeType: string;
  url: string;
  assetId: string;
}

export function isAgentAttachmentFile(file: File): boolean {
  const type = file.type || FALLBACK_MIME;
  if (type.startsWith('image/')) return true;
  return type === 'application/pdf';
}

export function appendAttachmentsToMessage(
  text: string,
  attachments: AgentAttachmentReady[],
): string {
  let out = text.trim();
  for (const att of attachments) {
    if (att.mimeType.startsWith('image/')) {
      out += `${out ? '\n\n' : ''}![${att.name}](${att.url})`;
    } else {
      out += `${out ? '\n\n' : ''}[${att.name}](${att.url})`;
    }
  }
  return out;
}

export async function uploadAgentAttachment(file: File): Promise<AgentAttachmentReady> {
  if (!isAgentAttachmentFile(file)) {
    throw new Error(t('agent.attach.unsupported'));
  }
  if (file.size > MAX_BYTES) {
    throw new Error(t('agent.attach.tooLarge'));
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

  return {
    assetId: ticket.data.assetId,
    name: file.name,
    mimeType: file.type || FALLBACK_MIME,
    url: urlResult.data.url,
  };
}
