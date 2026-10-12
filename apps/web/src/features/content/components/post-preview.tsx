import type { ContentType, Platform } from '@agency-os/contracts';
import { ContentMediaPreview } from './content-media-preview';

interface PostPreviewProps {
  clientName: string;
  clientColor: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  hashtags: string[];
  title: string;
  media: { url?: string; mimeType: string; name: string }[];
}

/** @deprecated Use ContentMediaPreview directly. */
export function PostPreview(props: PostPreviewProps) {
  return <ContentMediaPreview {...props} />;
}
