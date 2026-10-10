import { Module, forwardRef } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AgentModule } from '../agent/agent.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AuditModule } from '../audit/audit.module';
import { AutomationModule } from '../automation/automation.module';
import { BillingModule } from '../billing/billing.module';
import { CalendarModule } from '../calendar/calendar.module';
import { ChatModule } from '../chat/chat.module';
import { ClientsModule } from '../clients/clients.module';
import { CrmModule } from '../crm/crm.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportingModule } from '../reporting/reporting.module';
import { SearchModule } from '../search/search.module';
import { SocialModule } from '../social/social.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { TimeModule } from '../time/time.module';
import { WorkModule } from '../work/work.module';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { CapabilityExecutorService } from './application/services/capability-executor.service';
import { CapabilityHandlersService } from './application/services/capability-handlers.service';
import { CapabilityRegistryService } from './application/services/capability-registry.service';
import { McpRpcService } from './application/services/mcp-rpc.service';
import { McpSseService } from './application/services/mcp-sse.service';
import { CapabilitiesController } from './interface/http/controllers/capabilities.controller';
import { McpController } from './interface/http/controllers/mcp.controller';
import { McpSseController } from './interface/http/controllers/mcp-sse.controller';

@Module({
  imports: [
    ClientsModule,
    CrmModule,
    WorkModule,
    SocialModule,
    CalendarModule,
    forwardRef(() => ChatModule),
    MediaModule,
    ApprovalsModule,
    FinanceModule,
    TimeModule,
    forwardRef(() => AutomationModule),
    SearchModule,
    NotificationsModule,
    TenancyModule,
    KnowledgeModule,
    WorkflowEngineModule,
    IntegrationsModule,
    FeedbackModule,
    ReportingModule,
    AnalyticsModule,
    AuditModule,
    IdentityModule,
    AccessModule,
    InvitationsModule,
    BillingModule,
    forwardRef(() => AgentModule),
  ],
  controllers: [CapabilitiesController, McpController, McpSseController],
  providers: [
    CapabilityRegistryService,
    CapabilityHandlersService,
    CapabilityExecutorService,
    McpRpcService,
    McpSseService,
  ],
  exports: [
    CapabilityRegistryService,
    CapabilityExecutorService,
    CapabilityHandlersService,
  ],
})
export class CapabilitiesModule {}
