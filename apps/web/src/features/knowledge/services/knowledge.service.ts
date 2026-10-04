import 'server-only';
import { knowledgeRepository, type Article } from '../data/knowledge.repository';

export async function listArticles(): Promise<Article[]> {
  const articles = await knowledgeRepository.list();
  return articles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const getArticle = (id: string) => knowledgeRepository.get(id);
