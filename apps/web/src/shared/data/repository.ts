import 'server-only';
import { randomUUID } from 'node:crypto';
import { apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { unwrapList } from '@/shared/api/live/utils';

export interface Entity {
  id: string;
}

type RawRecord = Record<string, unknown>;

export interface LiveBinding<T extends Entity> {
  /** API collection path for the active organisation, e.g. `v1/organizations/{org}/clients`. */
  path: (organizationId: string) => string;
  /** Optional direct-item path; falls back to scanning the list. */
  itemPath?: (organizationId: string, id: string) => string;
  /** Maps an API row to the UI shape. */
  fromApi: (raw: RawRecord) => T;
  /** Maps UI input to an API create/update body. */
  toApi?: (input: Partial<T>) => Promise<RawRecord> | RawRecord;
  /** Maps a partial UI patch to a PATCH body when it differs from the create body. */
  toApiPatch?: (patch: Partial<T>) => Promise<RawRecord> | RawRecord;
  /** Cache tag suffix (namespaced per organisation). */
  tag: string;
  /** When true, `remove` issues DELETE against the collection item path. */
  deletable?: boolean;
}

export interface Repository<T extends Entity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, 'id'> & { id?: string }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
  remove(id: string): Promise<void>;
  tag(orgId: string): string;
}

declare global {
  var __agencyOsDemoStore: Map<string, unknown[]> | undefined;
}

function store(): Map<string, unknown[]> {
  globalThis.__agencyOsDemoStore ??= new Map();
  return globalThis.__agencyOsDemoStore;
}

function useLive<T extends Entity>(live: LiveBinding<T> | undefined): live is LiveBinding<T> {
  return isLiveMode && live !== undefined;
}

export function createRepository<T extends Entity>(
  name: string,
  seed: () => T[],
  live?: LiveBinding<T>,
): Repository<T> {
  const rows = (): T[] => {
    const s = store();
    if (!s.has(name)) s.set(name, seed());
    return s.get(name) as T[];
  };

  const orgId = async (): Promise<string> => (await getSession())?.orgId ?? '';

  return {
    tag: (org) => `org:${org}:${live?.tag ?? name}`,

    async list() {
      if (useLive(live)) {
        const org = await orgId();
        const data = await apiFetch<unknown>(live.path(org), { tags: [`org:${org}:${live.tag}`] });
        return unwrapList(data).map(live.fromApi);
      }
      return [...rows()];
    },

    async get(id) {
      if (useLive(live)) {
        const org = await orgId();
        if (live.itemPath) {
          try {
            const raw = await apiFetch<RawRecord>(live.itemPath(org, id), { tags: [`org:${org}:${live.tag}`] });
            return live.fromApi(raw);
          } catch {
            return undefined;
          }
        }
        const all = await this.list();
        return all.find((item) => item.id === id);
      }
      return rows().find((item) => item.id === id);
    },

    async create(input) {
      if (useLive(live)) {
        const org = await orgId();
        const body = live.toApi ? await live.toApi(input as Partial<T>) : (input as RawRecord);
        const created = await apiFetch<RawRecord>(live.path(org), { method: 'POST', body });
        return live.fromApi(created);
      }
      const item = { ...input, id: input.id ?? randomUUID() } as T;
      rows().unshift(item);
      return item;
    },

    async update(id, patch) {
      if (useLive(live)) {
        const org = await orgId();
        const toBody = live.toApiPatch ?? live.toApi;
        const body = toBody ? await toBody(patch) : (patch as RawRecord);
        const updated = await apiFetch<RawRecord>(`${live.path(org)}/${id}`, { method: 'PATCH', body });
        return live.fromApi(updated);
      }
      const list = rows();
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) return undefined;
      const next = { ...list[index], ...patch, id } as T;
      list[index] = next;
      return next;
    },

    async remove(id) {
      if (useLive(live)) {
        if (!live.deletable) return;
        const org = await orgId();
        await apiFetch(`${live.path(org)}/${id}`, { method: 'DELETE' });
        return;
      }
      const list = rows();
      const index = list.findIndex((item) => item.id === id);
      if (index !== -1) list.splice(index, 1);
    },
  };
}
