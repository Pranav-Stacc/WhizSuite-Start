import { Injectable } from '@nestjs/common';
import {
  DefaultClientFolderTemplate,
  DefaultContentPlatformFolders,
  DefaultShootFolderNames,
  ErrorCodes,
  type CreateMediaFolderInput,
  type MediaFolderDto,
  type UpdateMediaFolderInput,
} from '@agency-os/contracts';
import {
  notFound,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { MediaRepository } from '../../infrastructure/repositories/media.repository';
import { toMediaFolderDto } from '../mappers/media-asset.mapper';

const ENTITY = 'mediaFolder';

function joinPath(parentPath: string | null, name: string): string {
  const segment = name.trim().replaceAll('/', '-');
  return parentPath ? `${parentPath}/${segment}` : `/${segment}`;
}

@Injectable()
export class MediaFoldersService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    organizationId: string,
    filters: {
      clientId?: string;
      projectId?: string;
      calendarItemId?: string;
      parentId?: string;
      clientVisibleOnly?: boolean;
    } = {},
  ): Promise<MediaFolderDto[]> {
    const folders = await this.repository.listFolders(organizationId, {
      ...filters,
      allowedClientIds: TenantContext.clientScope(),
    });
    return folders.map(toMediaFolderDto);
  }

  async get(organizationId: string, id: string): Promise<MediaFolderDto> {
    const folder = await this.repository.findFolder(organizationId, id);
    if (!folder || !TenantContext.canAccessClient(folder.clientId))
      throw notFound();
    return toMediaFolderDto(folder);
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateMediaFolderInput,
  ): Promise<MediaFolderDto> {
    let clientId = input.clientId ?? null;
    let parentPath: string | null = null;
    let projectId = input.projectId ?? null;
    let calendarItemId = input.calendarItemId ?? null;

    if (input.parentId) {
      const parent = await this.repository.findFolder(
        organizationId,
        input.parentId,
      );
      if (!parent) throw notFound('Parent folder not found');
      if (!TenantContext.canAccessClient(parent.clientId))
        throw notFound('Parent folder not found');
      parentPath = parent.path;
      clientId = parent.clientId ?? clientId;
      projectId = parent.projectId ?? projectId;
      calendarItemId = parent.calendarItemId ?? calendarItemId;
    }

    if (clientId && !TenantContext.canAccessClient(clientId))
      throw notFound('Client not found');

    // Root folders for a client share the same path prefix as ensure-client trees.
    const rootPrefix =
      !parentPath && clientId ? `/clients/${clientId}` : parentPath;
    const path = joinPath(rootPrefix, input.name);
    const existing = await this.repository.findFolderByPath(
      organizationId,
      path,
    );
    if (existing) {
      throw problem(
        409,
        'Conflict',
        ErrorCodes.CONFLICT,
        'A folder already exists at this path',
      );
    }

    const folder = await this.repository.createFolder(organizationId, {
      name: input.name.trim(),
      path,
      parentId: input.parentId,
      clientId,
      projectId,
      calendarItemId,
      visibility: input.visibility,
      description: input.description,
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/folders.create',
      entityType: ENTITY,
      entityId: folder.id,
      after: {
        name: folder.name,
        path: folder.path,
        visibility: folder.visibility,
      },
    });
    return toMediaFolderDto(folder);
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateMediaFolderInput,
  ): Promise<MediaFolderDto> {
    const before = await this.get(organizationId, id);
    const existing = await this.repository.findFolder(organizationId, id);
    if (!existing) throw notFound();

    let nextPath = existing.path;
    if (input.name && input.name.trim() !== existing.name) {
      const parentPath = existing.path.includes('/')
        ? existing.path.slice(0, existing.path.lastIndexOf('/')) || null
        : null;
      nextPath = joinPath(parentPath === '/' ? null : parentPath, input.name);
      const clash = await this.repository.findFolderByPath(
        organizationId,
        nextPath,
      );
      if (clash && clash.id !== id) {
        throw problem(
          409,
          'Conflict',
          ErrorCodes.CONFLICT,
          'A folder already exists at this path',
        );
      }
      const descendants = await this.repository.listFolderDescendants(
        organizationId,
        existing.path,
      );
      for (const child of descendants) {
        await this.repository.updateFolder(organizationId, child.id, {
          path: `${nextPath}${child.path.slice(existing.path.length)}`,
        });
      }
    }

    await this.repository.updateFolder(organizationId, id, {
      ...input,
      ...(nextPath !== existing.path ? { path: nextPath } : {}),
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/folders.update',
      entityType: ENTITY,
      entityId: id,
      before,
      after: { ...input, path: nextPath },
    });
    return this.get(organizationId, id);
  }

  async remove(organizationId: string, actorId: string, id: string) {
    await this.get(organizationId, id);
    if (!(await this.repository.deleteFolder(organizationId, id)))
      throw notFound();
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/folders.delete',
      entityType: ENTITY,
      entityId: id,
    });
  }

  /** Ensures Brand Assets / Content / Shoots / Deliverables / Agency (+ platform shelves). */
  async ensureClientFolderTree(
    organizationId: string,
    actorId: string,
    clientId: string,
  ): Promise<MediaFolderDto[]> {
    if (!TenantContext.canAccessClient(clientId))
      throw notFound('Client not found');
    const created: MediaFolderDto[] = [];
    let contentRoot: MediaFolderDto | undefined;

    for (const template of DefaultClientFolderTemplate) {
      const folder = await this.ensureFolderAtPath(
        organizationId,
        actorId,
        clientId,
        `/clients/${clientId}/${template.name}`,
        template.name,
        template.visibility,
        null,
      );
      created.push(folder);
      if (template.name === 'Content') contentRoot = folder;
    }

    if (contentRoot) {
      for (const name of DefaultContentPlatformFolders) {
        const child = await this.ensureFolderAtPath(
          organizationId,
          actorId,
          clientId,
          `${contentRoot.path}/${name}`,
          name,
          'CLIENT_VISIBLE',
          contentRoot.id,
        );
        created.push(child);
      }
    }

    return created;
  }

  private async ensureFolderAtPath(
    organizationId: string,
    actorId: string,
    clientId: string,
    clientPath: string,
    name: string,
    visibility: 'INTERNAL' | 'CLIENT_VISIBLE',
    parentId: string | null,
  ): Promise<MediaFolderDto> {
    const scoped = await this.repository.findFolderByPath(
      organizationId,
      clientPath,
    );
    if (scoped) return toMediaFolderDto(scoped);

    const folder = await this.repository.createFolder(organizationId, {
      name,
      path: clientPath,
      clientId,
      parentId: parentId ?? undefined,
      visibility,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/folders.ensure_client_tree',
      entityType: ENTITY,
      entityId: folder.id,
      after: { clientId, name: folder.name, parentId },
    });
    return toMediaFolderDto(folder);
  }

  /** Creates Shoots/{title}/Raw|Selects|Finals|Deliverables under the client Shoots root. */
  async createShootFolderTree(
    organizationId: string,
    actorId: string,
    input: {
      clientId: string;
      projectId?: string;
      calendarItemId: string;
      shootTitle: string;
    },
  ): Promise<MediaFolderDto[]> {
    const roots = await this.ensureClientFolderTree(
      organizationId,
      actorId,
      input.clientId,
    );
    const shootsRoot =
      roots.find((f) => f.name === 'Shoots') ??
      (await this.list(organizationId, { clientId: input.clientId })).find(
        (f) => f.name === 'Shoots',
      );
    if (!shootsRoot) throw notFound('Shoots root folder missing');

    const shootPath = joinPath(shootsRoot.path, input.shootTitle);
    let shootFolder = await this.repository.findFolderByPath(
      organizationId,
      shootPath,
    );
    if (!shootFolder) {
      shootFolder = await this.repository.createFolder(organizationId, {
        name: input.shootTitle.trim(),
        path: shootPath,
        parentId: shootsRoot.id,
        clientId: input.clientId,
        projectId: input.projectId,
        calendarItemId: input.calendarItemId,
        visibility: 'INTERNAL',
        description: 'Shoot media root',
      });
    }

    const folders = [toMediaFolderDto(shootFolder)];
    for (const name of DefaultShootFolderNames) {
      const path = joinPath(shootFolder.path, name);
      const existing = await this.repository.findFolderByPath(
        organizationId,
        path,
      );
      if (existing) {
        folders.push(toMediaFolderDto(existing));
        continue;
      }
      const child = await this.repository.createFolder(organizationId, {
        name,
        path,
        parentId: shootFolder.id,
        clientId: input.clientId,
        projectId: input.projectId,
        calendarItemId: input.calendarItemId,
        visibility: name === 'Deliverables' ? 'CLIENT_VISIBLE' : 'INTERNAL',
      });
      folders.push(toMediaFolderDto(child));
    }

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/folders.create_shoot_tree',
      entityType: ENTITY,
      entityId: shootFolder.id,
      after: {
        calendarItemId: input.calendarItemId,
        folders: folders.map((f) => f.path),
      },
    });
    return folders;
  }
}
