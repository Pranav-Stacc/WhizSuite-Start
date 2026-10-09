import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DataScopeInterceptor } from './modules/access/interface/http/data-scope.interceptor';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import type { AppConfig } from './shared/config/app.config';
import { SharedModule } from './shared/shared.module';
import { TenantMiddleware } from './shared/tenant/tenant.middleware';
import { HealthController } from './health.controller';
import { AuditModule } from './modules/audit/audit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AccessModule } from './modules/access/access.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { CrmModule } from './modules/crm/crm.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SocialModule } from './modules/social/social.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkModule } from './modules/work/work.module';
import { WorkflowEngineModule } from './modules/workflow-engine/workflow-engine.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { MediaModule } from './modules/media/media.module';
import { AutomationModule } from './modules/automation/automation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { FinanceModule } from './modules/finance/finance.module';
import { TimeModule } from './modules/time/time.module';
import { CustomizationModule } from './modules/customization/customization.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { SearchModule } from './modules/search/search.module';
import { ActivityModule } from './modules/activity/activity.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AiModule } from './modules/ai/ai.module';
import { AgentModule } from './modules/agent/agent.module';
import { CapabilitiesModule } from './modules/capabilities/capabilities.module';
import { BillingModule } from './modules/billing/billing.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        {
          ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    TerminusModule,
    SharedModule,
    AuditModule,
    AccessModule,
    IdentityModule,
    TenancyModule,
    InvitationsModule,
    CrmModule,
    ClientsModule,
    WorkModule,
    WorkflowEngineModule,
    SocialModule,
    ChatModule,
    ApprovalsModule,
    FeedbackModule,
    MediaModule,
    AutomationModule,
    NotificationsModule,
    AnalyticsModule,
    ReportingModule,
    FinanceModule,
    TimeModule,
    CustomizationModule,
    TemplatesModule,
    CalendarModule,
    SearchModule,
    ActivityModule,
    IntegrationsModule,
    AiModule,
    CapabilitiesModule,
    AgentModule,
    BillingModule,
    KnowledgeModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: DataScopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
