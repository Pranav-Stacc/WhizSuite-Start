import { Injectable } from '@nestjs/common';
import { AiRepository } from '../../infrastructure/repositories/ai.repository';

@Injectable()
export class AiService {
  constructor(private readonly repository: AiRepository) {}

  generateCaption(input: {
    topic: string;
    tone?: string;
    platform?: string;
    maxLength?: number;
  }) {
    const tone = input.tone ?? 'professional';
    const platform = input.platform ?? 'instagram';
    const caption = `[${tone}] ${input.topic} — crafted for ${platform}. #AgencyOS`;
    const trimmed =
      input.maxLength && caption.length > input.maxLength
        ? `${caption.slice(0, input.maxLength - 3)}...`
        : caption;
    return {
      caption: trimmed,
      hashtags: ['#AgencyOS', '#SocialMedia', '#Marketing'],
      model: 'stub-v1',
    };
  }

  suggestHashtags(input: { topic: string; count?: number }) {
    const base = ['marketing', 'socialmedia', 'branding', 'content', 'agency'];
    const topicTag = input.topic.toLowerCase().replace(/\s+/g, '');
    const tags = [`#${topicTag}`, ...base.map((t) => `#${t}`)];
    return { hashtags: tags.slice(0, input.count ?? 5) };
  }

  summarizeText(input: { text: string; maxSentences?: number }) {
    const sentences = input.text.split(/[.!?]+/).filter(Boolean);
    const limit = input.maxSentences ?? 2;
    return {
      summary: sentences.slice(0, limit).join('. ').trim(),
      model: 'stub-v1',
    };
  }
}
