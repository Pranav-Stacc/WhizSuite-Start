import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ArticleCategories,
  ErrorCodes,
  type ArticleCategory,
  type ArticleDto,
  type ArticleInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import {
  KnowledgeRepository,
  type ArticleRecord,
  type ArticleRow,
} from '../../infrastructure/repositories/knowledge.repository';

const ENTITY_TYPE = 'article';

/** Shape stored in `KbPage.content`. */
interface ArticleContent {
  body: string;
  authorId: string | null;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<ArticleDto[]> {
    const limit = this.config.get('ARTICLE_LIST_LIMIT', { infer: true });
    const records = await this.repository.list(
      organizationId,
      ArticleCategories,
      limit,
    );
    return records.map(toArticleDto);
  }

  async get(organizationId: string, id: string): Promise<ArticleDto> {
    return toArticleDto(await this.require(organizationId, id));
  }

  async create(
    organizationId: string,
    actorId: string,
    input: ArticleInput,
  ): Promise<ArticleDto> {
    const content: ArticleContent = { body: input.body, authorId: actorId };
    const record = await this.repository.create(organizationId, {
      spaceId: await this.repository.spaceIdFor(organizationId, input.category),
      title: input.title,
      content: { ...content },
    });
    const dto = toArticleDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'article.create',
      entityType: ENTITY_TYPE,
      entityId: dto.id,
      after: { ...dto },
    });
    return dto;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: Partial<ArticleInput>,
  ): Promise<ArticleDto> {
    const before = toArticleDto(await this.require(organizationId, id));
    const row: ArticleRow = {};
    if (input.title) row.title = input.title;
    if (input.category)
      row.spaceId = await this.repository.spaceIdFor(
        organizationId,
        input.category,
      );
    if (input.body) {
      const content: ArticleContent = {
        body: input.body,
        authorId: before.authorId,
      };
      row.content = { ...content };
    }
    const dto = toArticleDto(
      await this.repository.update(organizationId, id, row),
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'article.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { ...before },
      after: { ...dto },
    });
    return dto;
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const before = toArticleDto(await this.require(organizationId, id));
    await this.repository.delete(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'article.delete',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { ...before },
    });
  }

  private async require(
    organizationId: string,
    id: string,
  ): Promise<ArticleRecord> {
    const record = await this.repository.findById(organizationId, id);
    if (!record) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        'Article not found',
      );
    }
    return record;
  }
}

function contentOf(record: ArticleRecord): ArticleContent {
  const raw = record.content;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { body: '', authorId: null };
  return {
    body: typeof raw.body === 'string' ? raw.body : '',
    authorId: typeof raw.authorId === 'string' ? raw.authorId : null,
  };
}

function toCategory(name: string): ArticleCategory {
  const category = ArticleCategories.find((candidate) => candidate === name);
  if (!category)
    throw new Error(`Knowledge space is not an article category: ${name}`);
  return category;
}

function toArticleDto(record: ArticleRecord): ArticleDto {
  const content = contentOf(record);
  return {
    id: record.id,
    title: record.title,
    category: toCategory(record.space.name),
    body: content.body,
    authorId: content.authorId,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
