import 'server-only';
import { listClients } from '@/features/clients/services/clients.service';
import { listAssets } from '@/features/media/services/media.service';
import type { Asset } from '@/features/media/data/media.repository';
import { toComposerAssets, toComposerClients, toComposerPost } from '../components/composer-mappers';
import type { ComposerAsset, ComposerClient, ComposerPost } from '../components/content-composer';
import type { Post } from '../data/content.repository';
import { isEditable } from '../workflow';
import { listClientContent } from './content.service';

export interface PlannerData {
  posts: Post[];
  assets: Asset[];
  drawer: { clientId: string; clients: ComposerClient[]; assets: ComposerAsset[]; posts: ComposerPost[]; lockedPostIds: string[] };
}

/** Everything a client-workspace planner view needs: the client's posts, its library and the drawer payload. */
export async function loadPlanner(clientId: string): Promise<PlannerData> {
  const [posts, clients, allAssets] = await Promise.all([listClientContent(clientId), listClients(), listAssets()]);
  const assets = allAssets.filter((a) => a.clientId === clientId);
  return {
    posts,
    assets,
    drawer: {
      clientId,
      clients: toComposerClients(clients),
      assets: toComposerAssets(assets),
      posts: posts.map(toComposerPost),
      lockedPostIds: posts.filter((p) => !isEditable(p.status)).map((p) => p.id),
    },
  };
}
