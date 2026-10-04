import 'server-only';
import { mediaRepository, type Asset } from '../data/media.repository';

export async function listAssets(): Promise<Asset[]> {
  const rows = await mediaRepository.list();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
