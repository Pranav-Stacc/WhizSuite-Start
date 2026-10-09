import type { ArticleCategory } from '../schemas/forms.js';

export const ARTICLE_LIST_LIMIT_DEFAULT = 500;
export const ARTICLE_TITLE_MAX_LENGTH = 200;
export const ARTICLE_BODY_MAX_LENGTH = 50_000;

export interface ArticleInput {
  title: string;
  category: ArticleCategory;
  body: string;
}

export interface ArticleDto extends ArticleInput {
  id: string;
  authorId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
