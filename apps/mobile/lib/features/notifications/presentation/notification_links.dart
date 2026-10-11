import '../../../app/navigation/app_routes.dart';
import '../../../core/data/json_read.dart';
import '../../approvals/approvals_routes.dart';
import '../../calendar/calendar_routes.dart';
import '../../content/content_routes.dart';
import '../../messages/messages_routes.dart';
import '../../tasks/tasks_routes.dart';
import '../domain/app_notification.dart';

/// Where tapping a notification leads: its subject when the payload names one, else the feed.
/// Keyed on the payload (`NotificationData`) so new notification types link without changes here.
String notificationLink(AppNotification notification) {
  final data = notification.data;
  final roomId = data.strOrNull('roomId') ?? data.strOrNull('threadId');
  if (roomId != null) return MessagesRoutes.detail(roomId);
  final approvalId = data.strOrNull('approvalId');
  if (approvalId != null) return ApprovalsRoutes.detail(approvalId);
  final contentId = data.strOrNull('contentId');
  if (contentId != null) return ContentRoutes.detail(contentId);
  final taskId = data.strOrNull('taskId');
  if (taskId != null) return TasksRoutes.detail(taskId);
  if (data.strOrNull('calendarItemId') != null) return CalendarRoutes.root;
  return AppRoutes.notifications;
}
