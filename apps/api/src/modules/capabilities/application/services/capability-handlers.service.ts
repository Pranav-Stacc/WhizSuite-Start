import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ErrorCodes,
  type ApiContentType,
  type ApprovalAction,
  type ArticleCategory,
  type AutomationAction,
  type AutomationTrigger,
  type ContentReviewOutcome,
  type ContentStatus,
  type FeedbackSubjectType,
  type FeedbackThreadStatus,
  type IntegrationConnectionStatus,
  type LeadStage,
  type Permission,
  type Platform,
  type Priority,
  type ProjectStatus,
  type RoleKind,
  type TaskStatus,
} from '@agency-os/contracts';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { RolesService } from '../../../access/application/services/roles.service';
import { AgentRunService } from '../../../agent/application/services/agent-run.service';
import { AnalyticsService } from '../../../analytics/application/services/analytics.service';
import { ApprovalsService } from '../../../approvals/application/services/approvals.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AutomationService } from '../../../automation/application/services/automation.service';
import { BillingService } from '../../../billing/application/services/billing.service';
import { CalendarFeedService } from '../../../calendar/application/services/calendar-feed.service';
import { CalendarService } from '../../../calendar/application/services/calendar.service';
import { ShootService } from '../../../calendar/application/services/shoot.service';
import { ChatService } from '../../../chat/application/services/chat.service';
import { ClientsService } from '../../../clients/application/services/clients.service';
import { CrmService } from '../../../crm/application/services/crm.service';
import { FeedbackService } from '../../../feedback/application/services/feedback.service';
import { FinanceService } from '../../../finance/application/services/finance.service';
import { MembersService } from '../../../identity/application/services/members.service';
import { IntegrationsService } from '../../../integrations/application/services/integrations.service';
import { InvitationsService } from '../../../invitations/application/services/invitations.service';
import { KnowledgeService } from '../../../knowledge/application/services/knowledge.service';
import { MediaFoldersService } from '../../../media/application/services/media-folders.service';
import { MediaService } from '../../../media/application/services/media.service';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { ReportingService } from '../../../reporting/application/services/reporting.service';
import { SearchService } from '../../../search/application/services/search.service';
import { SocialService } from '../../../social/application/services/social.service';
import { TenancyService } from '../../../tenancy/application/services/tenancy.service';
import { TimeService } from '../../../time/application/services/time.service';
import { WorkService } from '../../../work/application/services/work.service';
import { WorkflowEngineService } from '../../../workflow-engine/application/services/workflow-engine.service';

export interface CapabilityContext {
  organizationId: string;
  actor: AuthenticatedUser;
}

@Injectable()
export class CapabilityHandlersService {
  constructor(
    private readonly clients: ClientsService,
    private readonly crm: CrmService,
    private readonly work: WorkService,
    private readonly social: SocialService,
    private readonly calendar: CalendarService,
    private readonly calendarFeed: CalendarFeedService,
    private readonly shoot: ShootService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
    private readonly media: MediaService,
    private readonly mediaFolders: MediaFoldersService,
    private readonly approvals: ApprovalsService,
    private readonly finance: FinanceService,
    private readonly time: TimeService,
    private readonly automations: AutomationService,
    private readonly search: SearchService,
    private readonly notifications: NotificationsService,
    private readonly tenancy: TenancyService,
    private readonly knowledge: KnowledgeService,
    private readonly workflows: WorkflowEngineService,
    private readonly integrations: IntegrationsService,
    private readonly feedback: FeedbackService,
    private readonly reporting: ReportingService,
    private readonly analytics: AnalyticsService,
    private readonly audit: AuditService,
    private readonly members: MembersService,
    private readonly invitations: InvitationsService,
    private readonly roles: RolesService,
    private readonly billing: BillingService,
    @Inject(forwardRef(() => AgentRunService))
    private readonly agents: AgentRunService,
  ) {}

  async execute(
    toolId: string,
    input: Record<string, unknown>,
    ctx: CapabilityContext,
  ): Promise<unknown> {
    const { organizationId, actor } = ctx;
    const actorId = actor.userId;

    switch (toolId) {
      case 'clients.list':
        return this.clients.list(
          organizationId,
          input.workspaceId as string | undefined,
        );
      case 'clients.get':
        return this.clients.get(organizationId, input.clientId as string);
      case 'clients.create': {
        const workspaceId =
          (input.workspaceId as string | undefined) ??
          (await this.tenancy.defaultWorkspaceId(organizationId));
        if (!workspaceId) {
          throw problem(
            HttpStatus.BAD_REQUEST,
            'Bad Request',
            ErrorCodes.VALIDATION_FAILED,
            'No workspace found',
          );
        }
        return this.clients.create(organizationId, actorId, {
          workspaceId,
          displayName: input.displayName as string,
          legalName: input.legalName as string | undefined,
          industry: input.industry as string | undefined,
          website: input.website as string | undefined,
        });
      }
      case 'clients.update':
        return this.clients.update(
          organizationId,
          input.clientId as string,
          actorId,
          {
            displayName: input.displayName as string | undefined,
            industry: input.industry as string | undefined,
            website: input.website as string | undefined,
            status: input.status as string | undefined,
          },
        );
      case 'clients.brand_kit.update':
        return this.clients.updateBrandKit(
          organizationId,
          input.clientId as string,
          actorId,
          {
            voiceTone:
              input.voice !== undefined || input.bannedWords !== undefined
                ? {
                    ...(input.voice !== undefined
                      ? { voice: input.voice as string }
                      : {}),
                    ...(input.bannedWords !== undefined
                      ? { bannedWords: input.bannedWords as string[] }
                      : {}),
                  }
                : undefined,
            colors:
              input.primaryColor !== undefined
                ? { primary: input.primaryColor as string }
                : undefined,
            contentPillars:
              input.pillars !== undefined
                ? { pillars: input.pillars as string[] }
                : undefined,
          },
        );

      case 'leads.list':
        return this.crm.list(organizationId);
      case 'leads.get':
        return this.crm.get(organizationId, input.leadId as string);
      case 'leads.create':
        return this.crm.create(organizationId, actorId, {
          companyName: input.companyName as string,
          contactName: input.contactName as string | undefined,
          contactEmail: input.contactEmail as string | undefined,
          stage: input.stage as LeadStage | undefined,
        });
      case 'leads.update':
        return this.crm.update(
          organizationId,
          actorId,
          input.leadId as string,
          {
            companyName: input.companyName as string | undefined,
            stage: input.stage as LeadStage | undefined,
            nextStep: input.nextStep as string | undefined,
          },
        );
      case 'leads.delete':
        await this.crm.remove(organizationId, actorId, input.leadId as string);
        return { ok: true as const };
      case 'leads.convert': {
        const lead = await this.crm.get(organizationId, input.leadId as string);
        const workspaceId =
          (input.workspaceId as string | undefined) ??
          (await this.tenancy.defaultWorkspaceId(organizationId));
        if (!workspaceId) {
          throw problem(
            HttpStatus.BAD_REQUEST,
            'Bad Request',
            ErrorCodes.VALIDATION_FAILED,
            'No workspace found',
          );
        }
        const client = await this.clients.create(organizationId, actorId, {
          workspaceId,
          displayName:
            (input.displayName as string | undefined) ?? lead.companyName,
        });
        return this.crm.update(organizationId, actorId, lead.id, {
          convertedClientId: client.id,
          stage: 'WON',
        });
      }

      case 'projects.list':
        return this.work.list(organizationId);
      case 'projects.get':
        return this.work.get(organizationId, input.projectId as string);
      case 'projects.create':
        return this.work.create(organizationId, actorId, {
          clientId: input.clientId as string,
          name: input.name as string,
          type: input.type as string | undefined,
          startDate: input.startDate as string | undefined,
          endDate: input.endDate as string | undefined,
        });
      case 'projects.update':
        return this.work.update(
          organizationId,
          actorId,
          input.projectId as string,
          {
            name: input.name as string | undefined,
            status: input.status as ProjectStatus | undefined,
          },
        );

      case 'tasks.list':
        return this.work.listTasks(
          organizationId,
          input.projectId as string | undefined,
        );
      case 'tasks.get':
        return this.work.getTask(organizationId, input.taskId as string);
      case 'tasks.create':
        return this.work.createTask(organizationId, actorId, {
          title: input.title as string,
          description: input.description as string | undefined,
          projectId: input.projectId as string | undefined,
          clientId: input.clientId as string | undefined,
          status: input.status as TaskStatus | undefined,
          priority: input.priority as Priority | undefined,
          dueDate: input.dueDate as string | undefined,
          assigneeUserIds: input.assigneeUserIds as string[] | undefined,
        });
      case 'tasks.update': {
        const taskId = input.taskId as string;
        const status = input.status as TaskStatus | undefined;
        const updated = await this.work.updateTask(
          organizationId,
          actorId,
          taskId,
          {
            title: input.title as string | undefined,
            description: input.description as string | undefined,
            priority: input.priority as Priority | undefined,
            dueDate:
              input.dueDate === null
                ? undefined
                : (input.dueDate as string | undefined),
            assigneeUserIds: input.assigneeUserIds as string[] | undefined,
          },
        );
        if (status && status !== updated.status) {
          return this.work.transitionTask(
            organizationId,
            actorId,
            taskId,
            status,
          );
        }
        return updated;
      }
      case 'tasks.set_priority': {
        const results = [];
        for (const taskId of input.taskIds as string[]) {
          results.push(
            await this.work.updateTask(organizationId, actorId, taskId, {
              priority: input.priority as Priority,
            }),
          );
        }
        return results;
      }
      case 'tasks.delete':
        await this.work.deleteTask(
          organizationId,
          actorId,
          input.taskId as string,
        );
        return { ok: true as const };
      case 'tasks.transition':
        return this.work.transitionTask(
          organizationId,
          actorId,
          input.taskId as string,
          input.status as TaskStatus,
        );
      case 'tasks.comment':
        return this.work.addTaskComment(
          organizationId,
          actorId,
          input.taskId as string,
          { body: input.body as string },
        );

      case 'content.list':
        return this.social.listContent(organizationId, {
          clientId: input.clientId as string | undefined,
          status: input.status as ContentStatus | undefined,
        });
      case 'content.get':
        return this.social.getContent(
          organizationId,
          input.contentId as string,
        );
      case 'content.create':
        return this.social.createContent(organizationId, actorId, {
          clientId: input.clientId as string,
          projectId: input.projectId as string | undefined,
          title: input.title as string,
          caption: input.caption as string | undefined,
          contentType: input.contentType as ApiContentType,
          platforms: input.platforms as Platform[] | undefined,
          scheduledAt: input.scheduledAt as string | undefined,
        });
      case 'content.update':
        return this.social.updateContent(
          organizationId,
          actorId,
          input.contentId as string,
          {
            title: input.title as string | undefined,
            caption: input.caption as string | undefined,
            scheduledAt: input.scheduledAt as string | undefined,
          },
        );
      case 'content.schedule':
        return this.social.updateContent(
          organizationId,
          actorId,
          input.contentId as string,
          {
            scheduledAt: input.scheduledAt as string | undefined,
          },
        );
      case 'content.delete':
        await this.social.deleteContent(
          organizationId,
          actorId,
          input.contentId as string,
        );
        return { ok: true as const };
      case 'content.transition':
        return this.social.transitionContent(
          organizationId,
          actorId,
          input.contentId as string,
          input.status as ContentStatus,
        );
      case 'content.review':
        return this.social.reviewContent(
          organizationId,
          actorId,
          input.contentId as string,
          input.status as ContentReviewOutcome,
        );
      case 'content.reorder':
        await this.social.reorderContent(organizationId, actorId, {
          clientId: input.clientId as string,
          orderedIds: input.orderedIds as string[],
        });
        return { ok: true as const };
      case 'content.schedule_variant':
        return this.social.scheduleVariant(
          organizationId,
          actorId,
          input.variantId as string,
          input.scheduledAt as string,
        );
      case 'content.publish':
        return this.social.transitionContent(
          organizationId,
          actorId,
          input.contentId as string,
          'PUBLISHED',
        );

      case 'calendar.list': {
        const from = input.from ? new Date(input.from as string) : new Date();
        const to = input.to
          ? new Date(input.to as string)
          : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
        return this.calendarFeed.feed(organizationId, {
          from: from.toISOString(),
          to: to.toISOString(),
        });
      }
      case 'calendar.get':
        return this.calendar.get(organizationId, input.itemId as string);
      case 'calendar.create':
        return this.calendar.create(organizationId, actorId, {
          sourceType: 'MANUAL',
          sourceId: randomUUID(),
          title: input.title as string,
          startsAt: input.startsAt as string,
          endsAt: input.endsAt as string | undefined,
          clientId: input.clientId as string | undefined,
          projectId: input.projectId as string | undefined,
          allDay: input.allDay as boolean | undefined,
          syncToGoogle: input.syncToGoogle as boolean | undefined,
          metadata: {
            reminderUserIds: [actorId],
            createdByAgent: true,
          },
        });
      case 'calendar.update':
        return this.calendar.update(
          organizationId,
          actorId,
          input.itemId as string,
          {
            title: input.title as string | undefined,
            startsAt: input.startsAt as string | undefined,
            endsAt: input.endsAt as string | undefined,
            allDay: input.allDay as boolean | undefined,
            syncToGoogle: input.syncToGoogle as boolean | undefined,
          },
        );
      case 'calendar.shoots.create':
        return this.shoot.create(organizationId, actorId, {
          title: input.title as string,
          startsAt: input.startsAt as string,
          endsAt: input.endsAt as string | undefined,
          clientId: input.clientId as string,
          projectId: input.projectId as string | undefined,
          allDay: (input.allDay as boolean | undefined) ?? true,
          createFolders: true,
          taskTitles: [],
          syncToGoogle: false,
        });

      case 'chat.rooms.list':
        return this.chat.listRooms(organizationId, actorId);
      case 'chat.messages.list':
        return this.chat.listMessages(
          organizationId,
          actorId,
          input.roomId as string,
          undefined,
          input.limit as number | undefined,
        );
      case 'chat.messages.send':
        return this.chat.sendMessage(
          organizationId,
          actor,
          input.roomId as string,
          { body: input.body as string },
        );
      case 'chat.rooms.create':
        return this.chat.createGroup(organizationId, actorId, {
          type: 'GROUP',
          name: input.name as string,
          memberUserIds: input.memberUserIds as string[],
        });
      case 'chat.dms.open':
        return this.chat.getOrCreateDm(organizationId, actorId, {
          userId: input.otherUserId as string,
        });
      case 'chat.rooms.client': {
        const client = await this.clients.get(
          organizationId,
          input.clientId as string,
        );
        return this.chat.getOrCreateClientRoom(
          organizationId,
          actorId,
          client.id,
          client.displayName,
        );
      }
      case 'chat.messages.edit':
        return this.chat.editMessage(
          organizationId,
          actorId,
          input.roomId as string,
          input.messageId as string,
          { body: input.body as string },
        );
      case 'chat.messages.delete':
        await this.chat.deleteMessage(
          organizationId,
          actorId,
          input.roomId as string,
          input.messageId as string,
        );
        return { ok: true as const };
      case 'chat.mark_read':
        await this.chat.markRead(
          organizationId,
          actorId,
          input.roomId as string,
          { messageId: input.messageId as string },
        );
        return { ok: true as const };

      case 'media.list':
        return this.media.list(organizationId, {
          clientId: input.clientId as string | undefined,
        });
      case 'media.get':
        return this.media.get(organizationId, input.assetId as string);
      case 'media.update': {
        const assetId = input.assetId as string;
        let result = await this.media.get(organizationId, assetId);
        if (input.name !== undefined) {
          result = await this.media.update(organizationId, actorId, assetId, {
            name: input.name as string,
          });
        }
        if (input.tags !== undefined) {
          result = await this.media.setTags(
            organizationId,
            actorId,
            assetId,
            input.tags as string[],
          );
        }
        return result;
      }
      case 'media.delete':
        await this.media.remove(
          organizationId,
          actorId,
          input.assetId as string,
        );
        return { ok: true as const };
      case 'media.download_url':
        return this.media.createDownloadUrl(
          organizationId,
          actorId,
          input.assetId as string,
          'attachment',
        );
      case 'media.upload':
        return this.media.createPresignedUpload(organizationId, actorId, {
          filename: input.filename as string,
          mimeType: input.mimeType as string,
          sizeBytes: input.sizeBytes as number,
          clientId: input.clientId as string | undefined,
        });
      case 'media.folders.list':
        return this.mediaFolders.list(organizationId, {
          clientId: input.clientId as string | undefined,
        });
      case 'media.folders.create':
        return this.mediaFolders.create(organizationId, actorId, {
          name: input.name as string,
          parentId: input.parentId as string | undefined,
          clientId: input.clientId as string | undefined,
          visibility: 'INTERNAL',
        });
      case 'media.folders.delete':
        await this.mediaFolders.remove(
          organizationId,
          actorId,
          input.folderId as string,
        );
        return { ok: true as const };
      case 'media.folders.ensure_client':
        return this.mediaFolders.ensureClientFolderTree(
          organizationId,
          actorId,
          input.clientId as string,
        );

      case 'approvals.list':
        return this.approvals.list(organizationId);
      case 'approvals.get':
        return this.approvals.get(organizationId, input.approvalId as string);
      case 'approvals.create':
        return this.approvals.request(organizationId, actorId, {
          subjectType: input.subjectType as string,
          subjectId: input.subjectId as string,
          subjectVersion: (input.subjectVersion as string) ?? '1',
          steps: [
            {
              name: (input.stepName as string) ?? 'Review',
              approverIds: [actorId],
            },
          ],
        });
      case 'approvals.act':
        return this.approvals.act(
          organizationId,
          actorId,
          input.approvalId as string,
          {
            action: input.action as ApprovalAction,
            comment: input.comment as string | undefined,
          },
        );

      case 'invoices.list':
        return this.finance.list(organizationId);
      case 'invoices.get':
        return this.finance.get(organizationId, input.invoiceId as string);
      case 'invoices.create':
        return this.finance.create(organizationId, actorId, {
          clientId: input.clientId as string,
          number: input.number as string,
          dueDate: input.dueDate as string,
          taxRate: (input.taxRate as number) ?? 0,
          lines: (
            input.lines as Array<{
              description: string;
              quantity: number;
              unitMinor: number;
            }>
          ).map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitMinor: l.unitMinor,
          })),
        });
      case 'invoices.update':
        return this.finance.update(
          organizationId,
          actorId,
          input.invoiceId as string,
          {
            dueDate: input.dueDate as string | undefined,
            taxRate: input.taxRate as number | undefined,
          },
        );
      case 'invoices.delete':
        await this.finance.remove(
          organizationId,
          actorId,
          input.invoiceId as string,
        );
        return { ok: true as const };

      case 'contracts.list':
        return this.finance.listContracts(
          organizationId,
          input.clientId as string | undefined,
        );
      case 'contracts.create':
        return this.finance.createContract(organizationId, actorId, {
          clientId: input.clientId as string,
          title: input.title as string,
          type: 'OTHER',
          startDate:
            (input.startDate as string | undefined) ??
            (input.startsAt as string | undefined),
          endDate:
            (input.endDate as string | undefined) ??
            (input.endsAt as string | undefined),
        });
      case 'contracts.update':
        return this.finance.updateContract(
          organizationId,
          actorId,
          input.contractId as string,
          {
            title: input.title as string | undefined,
          },
        );
      case 'contracts.sign':
        return this.finance.signContract(
          organizationId,
          actorId,
          input.contractId as string,
          {
            signerName: (input.signerName as string | undefined) ?? actor.email,
            method: (input.method as 'TYPED' | 'DRAWN' | undefined) ?? 'TYPED',
          },
        );
      case 'contracts.download_url':
        return this.finance.contractDownloadUrl(
          organizationId,
          input.contractId as string,
        );

      case 'time.list':
        return this.time.list(organizationId);
      case 'time.get':
        return this.time.get(organizationId, input.entryId as string);
      case 'time.create':
        return this.time.create(organizationId, actor, {
          projectId: input.projectId as string | undefined,
          taskId: input.taskId as string | undefined,
          clientId: input.clientId as string | undefined,
          minutes: input.minutes as number,
          note: input.note as string | undefined,
          date:
            (input.date as string | undefined) ??
            new Date().toISOString().slice(0, 10),
        });
      case 'time.delete':
        await this.time.remove(organizationId, actor, input.entryId as string);
        return { ok: true as const };
      case 'time.timer.get':
        return this.time.runningTimer(organizationId, actor);
      case 'time.timer.start':
        return this.time.startTimer(
          organizationId,
          actor,
          input.taskId as string,
        );
      case 'time.timer.stop':
        return this.time.stopTimer(organizationId, actor);

      case 'automations.list':
        return this.automations.list(organizationId);
      case 'automations.get':
        return this.automations.get(
          organizationId,
          input.automationId as string,
        );
      case 'automations.run':
        return this.automations.run(
          organizationId,
          actorId,
          String(input.automationId),
        );
      case 'automations.create':
        return this.automations.create(organizationId, actorId, {
          name: input.name as string,
          trigger: input.trigger as AutomationTrigger,
          action: input.action as AutomationAction,
          enabled: input.enabled as boolean | undefined,
        });
      case 'automations.update':
        return this.automations.update(
          organizationId,
          actorId,
          input.automationId as string,
          {
            name: input.name as string | undefined,
            trigger: input.trigger as AutomationTrigger | undefined,
            action: input.action as AutomationAction | undefined,
            enabled: input.enabled as boolean | undefined,
          },
        );
      case 'automations.publish':
        return this.automations.publish(
          organizationId,
          actorId,
          input.automationId as string,
          {},
        );
      case 'automations.archive':
        await this.automations.archive(
          organizationId,
          actorId,
          input.automationId as string,
        );
        return { ok: true as const };
      case 'automations.runs.list':
        return this.automations.listRuns(organizationId);

      case 'search.query':
        return this.search.search(organizationId, input.query as string);

      case 'intelligence.summarize':
        return this.buildSummary(organizationId, input);

      case 'notifications.list': {
        const rows = await this.notifications.list(organizationId, actorId);
        if (input.unreadOnly) return rows.filter((n) => !n.readAt);
        return rows;
      }
      case 'notifications.mark_read':
        return this.notifications.markRead(
          organizationId,
          input.notificationId as string,
          actorId,
        );
      case 'notifications.mark_all_read':
        return this.notifications.markAllRead(organizationId, actorId);

      case 'knowledge.list':
        return this.knowledge.list(organizationId);
      case 'knowledge.get':
        return this.knowledge.get(organizationId, input.articleId as string);
      case 'knowledge.create':
        return this.knowledge.create(organizationId, actorId, {
          title: input.title as string,
          body: input.body as string,
          category: ((input.category as string | undefined) ??
            'SOP') as ArticleCategory,
        });
      case 'knowledge.update':
        return this.knowledge.update(
          organizationId,
          actorId,
          input.articleId as string,
          {
            title: input.title as string | undefined,
            body: input.body as string | undefined,
            category: input.category as ArticleCategory | undefined,
          },
        );
      case 'knowledge.delete':
        await this.knowledge.remove(
          organizationId,
          actorId,
          input.articleId as string,
        );
        return { ok: true as const };

      case 'workflows.list':
        return this.workflows.list(organizationId);
      case 'workflows.get':
        return this.workflows.get(organizationId, input.workflowId as string);
      case 'workflows.create':
        return this.workflows.createDefinition(organizationId, actorId, {
          name: input.name as string,
          entityType: (['content', 'task', 'project', 'custom'] as const).includes(
            input.entityType as 'content',
          )
            ? (input.entityType as 'content' | 'task' | 'project' | 'custom')
            : 'content',
          stages: input.stages as Array<{ name: string; key: string }>,
          slaHours: input.slaHours as number | undefined,
          requiresClientApproval: input.requiresClientApproval as
            boolean | undefined,
          active: input.active as boolean | undefined,
        });
      case 'workflows.update':
        return this.workflows.updateDefinition(
          organizationId,
          actorId,
          input.workflowId as string,
          {
            name: input.name as string | undefined,
            active: input.active as boolean | undefined,
          },
        );
      case 'workflows.delete':
        await this.workflows.deleteDefinition(
          organizationId,
          actorId,
          input.workflowId as string,
        );
        return { ok: true as const };
      case 'workflows.publish':
        return this.workflows.publishVersion(
          organizationId,
          input.versionId as string,
        );

      case 'integrations.list':
        return this.integrations.list(organizationId);
      case 'integrations.get':
        return this.integrations.get(
          organizationId,
          input.connectionId as string,
        );
      case 'integrations.create':
        return this.integrations.create(organizationId, actorId, {
          providerId: input.providerId as string,
          clientId: input.clientId as string | undefined,
          metadata:
            input.label !== undefined
              ? { label: input.label as string }
              : undefined,
        });
      case 'integrations.update':
        return this.integrations.update(
          organizationId,
          actorId,
          input.connectionId as string,
          {
            status: input.status as IntegrationConnectionStatus | undefined,
            metadata:
              input.label !== undefined
                ? { label: input.label as string }
                : undefined,
          },
        );

      case 'feedback.list':
        return this.feedback.list(organizationId);
      case 'feedback.get':
        return this.feedback.get(organizationId, input.threadId as string);
      case 'feedback.create':
        return this.feedback.create(organizationId, actorId, {
          subjectType: input.subjectType as FeedbackSubjectType,
          subjectId: input.subjectId as string,
          subjectVersion: '1',
        });
      case 'feedback.update':
        return this.feedback.update(
          organizationId,
          actorId,
          input.threadId as string,
          {
            status: input.status as FeedbackThreadStatus | undefined,
          },
        );
      case 'feedback.comments.list':
        return this.feedback.listSubjectComments(organizationId, {
          subjectType: input.subjectType as FeedbackSubjectType,
          subjectId: input.subjectId as string,
        });
      case 'feedback.comments.add':
        return this.feedback.addSubjectComment(
          organizationId,
          actorId,
          {
            subjectType: input.subjectType as FeedbackSubjectType,
            subjectId: input.subjectId as string,
          },
          input.body as string,
        );

      case 'reports.list':
        return this.reporting.list(organizationId);
      case 'reports.get':
        return this.reporting.get(organizationId, input.reportId as string);
      case 'reports.create':
        return this.reporting.create(organizationId, actorId, {
          clientId: input.clientId as string,
          title: input.title as string,
          periodStart: input.periodStart as string,
          periodEnd: input.periodEnd as string,
        });

      case 'analytics.list':
        return this.analytics.list(organizationId, {
          from: input.from as string | undefined,
          metrics: input.metrics as string[] | undefined,
        });

      case 'audit.list':
        return this.audit.list(organizationId, {
          cursor: input.cursor as string | undefined,
          limit: input.limit as number | undefined,
        });

      case 'members.list':
        return this.members.list(organizationId);
      case 'members.invite':
        return this.invitations.invite(organizationId, actorId, {
          email: input.email as string,
          membershipType: input.membershipType as 'ADMIN' | 'MEMBER' | 'CLIENT',
          clientId: input.clientId as string | undefined,
        });
      case 'members.assign_roles':
        return this.members.assignRoles(
          organizationId,
          actorId,
          input.userId as string,
          input.roleIds as string[],
        );
      case 'members.deactivate':
        await this.members.deactivate(
          organizationId,
          actorId,
          input.userId as string,
        );
        return { ok: true as const };
      case 'invitations.revoke':
        await this.invitations.revoke(
          organizationId,
          actorId,
          input.invitationId as string,
        );
        return { ok: true as const };

      case 'roles.list':
        return this.roles.list(
          organizationId,
          input.kind as RoleKind | undefined,
        );
      case 'roles.create':
        return this.roles.create(organizationId, actorId, {
          name: input.name as string,
          description: input.description as string | undefined,
          permissionKeys: input.permissions as Permission[],
        });
      case 'roles.update':
        return this.roles.update(
          organizationId,
          actorId,
          input.roleId as string,
          {
            name: input.name as string | undefined,
            permissionKeys: input.permissions as Permission[] | undefined,
          },
        );
      case 'roles.delete':
        await this.roles.remove(
          organizationId,
          actorId,
          input.roleId as string,
        );
        return { ok: true as const };

      case 'departments.list':
        return this.tenancy.listDepartments(organizationId);
      case 'departments.create':
        return this.tenancy.createDepartment(organizationId, actorId, {
          name: input.name as string,
          parentId: input.parentId as string | undefined,
        });
      case 'teams.create':
        return this.tenancy.createTeam(organizationId, actorId, {
          name: input.name as string,
          description: input.description as string | undefined,
          workspaceId: input.workspaceId as string | undefined,
        });
      case 'workspaces.list':
        return this.tenancy.listWorkspaces(organizationId);
      case 'workspaces.create':
        return this.tenancy.createWorkspace(organizationId, actorId, {
          name: input.name as string,
          slug: input.slug as string,
          timezone: input.timezone as string | undefined,
        });
      case 'org.get':
        return this.tenancy.getOrganization(organizationId);
      case 'org.theme.update': {
        const current = await this.tenancy.getAppearanceTheme(organizationId);
        return this.tenancy.updateAppearanceTheme(organizationId, actorId, {
          ...current,
          ...(input.primary !== undefined
            ? { primary: input.primary as string }
            : {}),
          ...(input.secondary !== undefined
            ? { secondary: input.secondary as string }
            : input.accent !== undefined
              ? { secondary: input.accent as string }
              : {}),
          ...(input.background !== undefined
            ? { bg: input.background as string }
            : {}),
          ...(input.foreground !== undefined
            ? { fg: input.foreground as string }
            : {}),
          ...(input.border !== undefined
            ? { border: input.border as string }
            : {}),
        });
      }

      case 'billing.plans.list':
        return this.billing.listPlans();
      case 'billing.subscription.get':
        try {
          return {
            subscription: await this.billing.getSubscription(organizationId),
          };
        } catch (error) {
          if (error instanceof HttpException && error.getStatus() === 404) {
            return { subscription: null };
          }
          throw error;
        }

      case 'agents.definitions.list':
        return this.agents.listDefinitions(organizationId);
      case 'agents.definitions.create':
        return this.agents.createDefinition(organizationId, actorId, input);
      case 'agents.schedules.list':
        return this.agents.listSchedules(organizationId);
      case 'agents.schedules.create':
        return this.agents.createSchedule(organizationId, actorId, input);

      default:
        throw problem(
          HttpStatus.NOT_FOUND,
          'Not Found',
          ErrorCodes.NOT_FOUND,
          `Unknown capability: ${toolId}`,
        );
    }
  }

  private async buildSummary(
    organizationId: string,
    input: Record<string, unknown>,
  ) {
    const scope = input.scope as string;
    if (scope === 'client' && input.clientId) {
      const client = await this.clients.get(
        organizationId,
        input.clientId as string,
      );
      const tasks = await this.work.listTasks(organizationId);
      const clientTasks = tasks.filter((t) => t.clientId === client.id);
      const content = await this.social.listContent(organizationId, {
        clientId: client.id,
      });
      return {
        scope: 'client',
        client,
        openTasks: clientTasks.filter((t) => t.status !== 'DONE').length,
        totalTasks: clientTasks.length,
        contentItems: content.length,
        urgentTasks: clientTasks.filter((t) => t.priority === 'URGENT').length,
      };
    }
    if (scope === 'project' && input.projectId) {
      const project = await this.work.get(
        organizationId,
        input.projectId as string,
      );
      const tasks = await this.work.listTasks(organizationId, project.id);
      return {
        scope: 'project',
        project,
        openTasks: tasks.filter((t) => t.status !== 'DONE').length,
        urgentTasks: tasks.filter((t) => t.priority === 'URGENT').length,
      };
    }
    const clients = await this.clients.list(organizationId);
    const tasks = await this.work.listTasks(organizationId);
    const leads = await this.crm.list(organizationId);
    return {
      scope: 'organization',
      clientCount: clients.length,
      openTasks: tasks.filter((t) => t.status !== 'DONE').length,
      urgentTasks: tasks.filter((t) => t.priority === 'URGENT').length,
      leadCount: leads.length,
    };
  }
}
