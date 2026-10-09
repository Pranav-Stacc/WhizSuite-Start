import '../../approvals/approvals_routes.dart';
import '../../clients/clients_routes.dart';
import '../../content/content_routes.dart';
import '../../invoices/invoices_routes.dart';
import '../../leads/leads_routes.dart';
import '../../projects/projects_routes.dart';
import '../../tasks/tasks_routes.dart';

/// Entity kinds the app can open, normalised from the API's free-form `entityType`
/// strings and the search response groups.
enum EntityKind { client, project, task, lead, content, invoice, approval }

/// Aliases the API uses for each kind (lower-cased, singular and plural, camelCase models).
const Map<String, EntityKind> _aliases = {
  'client': EntityKind.client,
  'clients': EntityKind.client,
  'project': EntityKind.project,
  'projects': EntityKind.project,
  'task': EntityKind.task,
  'tasks': EntityKind.task,
  'lead': EntityKind.lead,
  'leads': EntityKind.lead,
  'content': EntityKind.content,
  'contentitem': EntityKind.content,
  'post': EntityKind.content,
  'invoice': EntityKind.invoice,
  'invoices': EntityKind.invoice,
  'approval': EntityKind.approval,
  'approvals': EntityKind.approval,
  'approvalrequest': EntityKind.approval,
};

EntityKind? entityKindOf(String type) => _aliases[type.trim().toLowerCase()];

/// Detail route of the owning feature, or null when the kind is unknown.
String? entityRoute(String type, String id) {
  if (id.isEmpty) return null;
  return switch (entityKindOf(type)) {
    EntityKind.client => ClientsRoutes.detail(id),
    EntityKind.project => ProjectsRoutes.detail(id),
    EntityKind.task => TasksRoutes.detail(id),
    EntityKind.lead => LeadsRoutes.detail(id),
    EntityKind.content => ContentRoutes.detail(id),
    EntityKind.invoice => InvoicesRoutes.detail(id),
    EntityKind.approval => ApprovalsRoutes.detail(id),
    null => null,
  };
}
