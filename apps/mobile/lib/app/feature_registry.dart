import '../core/navigation/feature_module.dart';
import '../features/approvals/approvals_module.dart';
import '../features/audit/audit_module.dart';
import '../features/automations/automations_module.dart';
import '../features/billing/billing_module.dart';
import '../features/calendar/calendar_module.dart';
import '../features/clients/clients_module.dart';
import '../features/content/content_module.dart';
import '../features/custom_fields/custom_fields_module.dart';
import '../features/dashboard/dashboard_module.dart';
import '../features/departments/departments_module.dart';
import '../features/inbox/inbox_module.dart';
import '../features/integrations/integrations_module.dart';
import '../features/invoices/invoices_module.dart';
import '../features/knowledge/knowledge_module.dart';
import '../features/leads/leads_module.dart';
import '../features/media/media_module.dart';
import '../features/messages/messages_module.dart';
import '../features/portal/portal_module.dart';
import '../features/projects/projects_module.dart';
import '../features/reports/reports_module.dart';
import '../features/roles/roles_module.dart';
import '../features/search/search_module.dart';
import '../features/tasks/tasks_module.dart';
import '../features/team/team_module.dart';
import '../features/templates/templates_module.dart';
import '../features/time/time_module.dart';
import '../features/workflows/workflows_module.dart';

/// Every feature plugged into the app, in navigation order. Adding a feature means
/// adding its module here; nothing else in the shell changes.
final List<FeatureModule> featureModules = [
  dashboardModule,
  searchModule,
  clientsModule,
  contentModule,
  calendarModule,
  tasksModule,
  projectsModule,
  approvalsModule,
  mediaModule,
  leadsModule,
  inboxModule,
  messagesModule,
  invoicesModule,
  timeModule,
  reportsModule,
  automationsModule,
  workflowsModule,
  integrationsModule,
  teamModule,
  rolesModule,
  departmentsModule,
  knowledgeModule,
  templatesModule,
  customFieldsModule,
  billingModule,
  auditModule,
  portalModule,
];
