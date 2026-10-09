// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'WhizSuite';

  @override
  String get authLoginTitle => 'Welcome back';

  @override
  String get authLoginSubtitle => 'Sign in to run your agency from one place.';

  @override
  String get authEmail => 'Work email';

  @override
  String get authEmailPlaceholder => 'you@agency.com';

  @override
  String get authPassword => 'Password';

  @override
  String get authLoginSubmit => 'Sign in';

  @override
  String get authLoginInvalid => 'Incorrect email or password.';

  @override
  String get authLoginExpired => 'Your session expired. Please sign in again.';

  @override
  String get authNoAccount => 'New to WhizSuite?';

  @override
  String get authCreateWorkspace => 'Create a workspace';

  @override
  String get authRegisterTitle => 'Create your agency workspace';

  @override
  String get authRegisterSubtitle =>
      'Set up in under two minutes. No credit card.';

  @override
  String get authFirstName => 'First name';

  @override
  String get authLastName => 'Last name';

  @override
  String get authOrganization => 'Agency name';

  @override
  String get authSlug => 'Workspace URL';

  @override
  String get authSlugHint => 'Lowercase letters, numbers and hyphens';

  @override
  String authRegisterPassword(int min) {
    return 'Password ($min+ characters)';
  }

  @override
  String get authRegisterSubmit => 'Create workspace';

  @override
  String get authRegisterExists =>
      'That workspace URL or email is already taken.';

  @override
  String get authHaveAccount => 'Already have a workspace?';

  @override
  String get authSignIn => 'Sign in';

  @override
  String get authShowPassword => 'Show password';

  @override
  String get authHidePassword => 'Hide password';

  @override
  String get authHeroEyebrow => 'WhizSuite';

  @override
  String get authHeroTitle =>
      'Every client, post and invoice in one calm cockpit.';

  @override
  String get authSignedOut => 'You have been signed out.';

  @override
  String get validationRequired => 'Required';

  @override
  String get validationEmail => 'Enter a valid email address';

  @override
  String validationMinLength(int min) {
    return 'Use at least $min characters';
  }

  @override
  String get validationSlug => 'Use lowercase letters, numbers and hyphens';

  @override
  String get errorOffline =>
      'You are offline. Check your connection and try again.';

  @override
  String get errorTimeout => 'The server took too long to respond.';

  @override
  String get errorUnauthorized => 'Your session expired. Please sign in again.';

  @override
  String get errorForbidden => 'You do not have permission to do that.';

  @override
  String get errorNotFound => 'We could not find that.';

  @override
  String get errorConflict =>
      'This was changed by someone else. Refresh and try again.';

  @override
  String get errorValidation => 'Some details are not valid.';

  @override
  String get errorRateLimited =>
      'Too many attempts. Wait a moment and try again.';

  @override
  String get errorServer => 'Something went wrong on our side.';

  @override
  String get errorUnknown => 'Something went wrong.';

  @override
  String get errorTitle => 'Something went wrong';

  @override
  String get retry => 'Try again';

  @override
  String get offlineBanner => 'Offline — showing saved data';

  @override
  String get forbiddenTitle => 'No access';

  @override
  String get forbiddenBody =>
      'Your role does not include this area. Ask an admin if you need it.';

  @override
  String get navHome => 'Overview';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navSettings => 'Settings';

  @override
  String get navMore => 'More';

  @override
  String get navGroupWork => 'Work';

  @override
  String get navGroupContent => 'Content';

  @override
  String get navGroupClients => 'Clients';

  @override
  String get navGroupAutomate => 'Automate';

  @override
  String get navGroupMoney => 'Money';

  @override
  String get navGroupAgency => 'Agency';

  @override
  String get navMoreEmpty => 'Nothing else is available for your role yet.';

  @override
  String homeGreeting(String name) {
    return 'Hello, $name';
  }

  @override
  String get homeSubtitle => 'Here is what needs you today.';

  @override
  String homeAccessSummary(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count permissions granted',
      one: '1 permission granted',
      zero: 'No permissions granted',
    );
    return '$_temp0';
  }

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsEmpty => 'You are all caught up';

  @override
  String get notificationsEmptyBody =>
      'New assignments, approvals and feedback will show up here.';

  @override
  String get notificationsMarkAll => 'Mark all read';

  @override
  String notificationsUnread(int count) {
    return '$count unread';
  }

  @override
  String get notificationsMarkRead => 'Mark as read';

  @override
  String get notificationTypeTaskAssigned => 'Task assigned';

  @override
  String get notificationTypeContentApproved => 'Content approved';

  @override
  String get notificationTypeContentChangesRequested => 'Changes requested';

  @override
  String get notificationTypeOther => 'Update';

  @override
  String get notificationChannelName => 'Agency updates';

  @override
  String get notificationChannelDescription =>
      'Assignments, approvals and feedback from your agency workspace';

  @override
  String get notificationsOpen => 'Open';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsProfile => 'Profile';

  @override
  String get profileJobTitle => 'Job title';

  @override
  String get settingsAppearance => 'Appearance';

  @override
  String get settingsAppearanceBody => 'Theme, colours and density';

  @override
  String get settingsNotifications => 'Notification preferences';

  @override
  String get settingsNotificationsBody =>
      'Choose how you hear about each update';

  @override
  String get settingsSignOut => 'Sign out';

  @override
  String get settingsSignOutConfirm => 'Sign out of WhizSuite on this device?';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get create => 'Create';

  @override
  String get edit => 'Edit';

  @override
  String get delete => 'Delete';

  @override
  String get close => 'Close';

  @override
  String get confirm => 'Confirm';

  @override
  String get viewAll => 'View all';

  @override
  String get details => 'Details';

  @override
  String get savedToast => 'Saved';

  @override
  String get createdToast => 'Created';

  @override
  String get deletedToast => 'Deleted';

  @override
  String deleteConfirmTitle(String name) {
    return 'Delete $name?';
  }

  @override
  String get deleteConfirmBody => 'This cannot be undone.';

  @override
  String get moreActions => 'More actions';

  @override
  String get unassigned => 'Unassigned';

  @override
  String get noDueDate => 'No due date';

  @override
  String get valueNone => 'None';

  @override
  String get valueClear => 'Clear';

  @override
  String get valueAdd => 'Add';

  @override
  String valueRemove(String value) {
    return 'Remove $value';
  }

  @override
  String get valueUnknown => '—';

  @override
  String get searchHint => 'Search';

  @override
  String get searchNoMatches => 'No matches';

  @override
  String get searchNoMatchesBody => 'Try a different search or filter.';

  @override
  String get filterAll => 'All';

  @override
  String get timeJustNow => 'just now';

  @override
  String timeMinutesAgo(int count) {
    return '${count}m ago';
  }

  @override
  String timeHoursAgo(int count) {
    return '${count}h ago';
  }

  @override
  String timeDaysAgo(int count) {
    return '${count}d ago';
  }

  @override
  String timeInMinutes(int count) {
    return 'in ${count}m';
  }

  @override
  String timeInHours(int count) {
    return 'in ${count}h';
  }

  @override
  String timeInDays(int count) {
    return 'in ${count}d';
  }

  @override
  String get dueToday => 'Due today';

  @override
  String get dueTomorrow => 'Due tomorrow';

  @override
  String dueInDays(int count) {
    return 'Due in ${count}d';
  }

  @override
  String dueOverdue(int count) {
    return '${count}d overdue';
  }

  @override
  String durationMinutes(int minutes) {
    return '${minutes}m';
  }

  @override
  String durationHours(int hours) {
    return '${hours}h';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '${hours}h ${minutes}m';
  }

  @override
  String fileSizeKb(int size) {
    return '$size KB';
  }

  @override
  String fileSizeMb(String size) {
    return '$size MB';
  }

  @override
  String get preferencesTitle => 'Notification preferences';

  @override
  String get preferencesBody =>
      'Pick the channels for each kind of update. Push needs notifications allowed on this device.';

  @override
  String get channelInApp => 'In-app';

  @override
  String get channelEmail => 'Email';

  @override
  String get channelPush => 'Push';

  @override
  String get preferencesSaved => 'Preferences saved';

  @override
  String get themeTitle => 'Make it yours';

  @override
  String get themeDescription =>
      'Pick a preset or fine-tune every colour. Changes apply instantly and are remembered on this device.';

  @override
  String get themePresets => 'Presets';

  @override
  String get themePresetEditorial => 'Editorial';

  @override
  String get themePresetNoir => 'Noir';

  @override
  String get themePresetMono => 'Monochrome';

  @override
  String get themePresetAurora => 'Aurora';

  @override
  String get themePresetOcean => 'Ocean';

  @override
  String get themePresetSunset => 'Sunset';

  @override
  String get themePresetRose => 'Rose';

  @override
  String get themePresetDaylight => 'Daylight';

  @override
  String get themeColors => 'Colours';

  @override
  String get themeColorPrimary => 'Primary';

  @override
  String get themeColorSecondary => 'Secondary';

  @override
  String get themeColorBg => 'Background';

  @override
  String get themeColorSurface => 'Surface';

  @override
  String get themeColorBorder => 'Border';

  @override
  String get themeColorFg => 'Primary text';

  @override
  String get themeColorMuted => 'Muted text';

  @override
  String get themeShape => 'Shape & density';

  @override
  String get themeRadius => 'Corner radius';

  @override
  String get themeDensity => 'Density';

  @override
  String get themeDensityComfortable => 'Comfortable';

  @override
  String get themeDensityCompact => 'Compact';

  @override
  String get themeReset => 'Reset to default';

  @override
  String get themeHexLabel => 'Hex colour';

  @override
  String get themeHexInvalid => 'Use the #RRGGBB format';

  @override
  String get themeApply => 'Apply';

  @override
  String get navApprovals => 'Approvals';

  @override
  String get approvalsTitle => 'Approvals';

  @override
  String get approvalsDescription =>
      'Everything waiting for a decision. Approve in one tap or tell the author what to fix.';

  @override
  String get approvalsDescriptionViewer =>
      'Requests you submitted that are waiting for a decision.';

  @override
  String get approvalsSearch => 'Search subject, requester or step';

  @override
  String get approvalsEmpty => 'Nothing to review';

  @override
  String get approvalsEmptyBody =>
      'When content or other work is sent for approval, it will appear here.';

  @override
  String get approvalsStatPending => 'Pending';

  @override
  String get approvalsStatPendingHint => 'Waiting on a decision';

  @override
  String get approvalsStatOverdue => 'Overdue';

  @override
  String get approvalsStatOverdueHint => 'Past their due date';

  @override
  String get approvalsStatDone => 'Decided';

  @override
  String get approvalsStatDoneHint => 'Approved, rejected or changes requested';

  @override
  String approvalStepsProgress(int done, int total) {
    return '$done of $total';
  }

  @override
  String approvalStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHANGES_REQUESTED': 'Changes requested',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String approvalSubjectType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'CONTENT': 'Content',
      'CLIENT': 'Client',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String approvalSubjectFallback(String type) {
    return '$type approval';
  }

  @override
  String approvalRequester(String name) {
    return 'Requested by $name';
  }

  @override
  String get approvalRequesterUnknown => 'Requested by a teammate';

  @override
  String approvalDue(String date) {
    return 'Due $date';
  }

  @override
  String get approvalDueLabel => 'Due date';

  @override
  String get approvalNoDue => 'No due date';

  @override
  String approvalRequestedAgo(String time) {
    return 'Requested $time';
  }

  @override
  String get approvalCurrentStep => 'Current step';

  @override
  String get approvalStepsTitle => 'Steps';

  @override
  String get approvalTimelineTitle => 'Activity';

  @override
  String get approvalTimelineEmpty => 'No decisions recorded yet.';

  @override
  String get approvalOpenSubject => 'Open subject';

  @override
  String get approvalDecideTitle => 'Your decision';

  @override
  String get approvalActionApprove => 'Approve';

  @override
  String get approvalActionReject => 'Reject';

  @override
  String get approvalActionRequestChanges => 'Request changes';

  @override
  String get approvalComment => 'Comment';

  @override
  String get approvalCommentHint => 'Optional note for the requester';

  @override
  String get approvalCommentRequiredHint => 'Tell them what to change';

  @override
  String get approvalApproveConfirmTitle => 'Approve this request?';

  @override
  String get approvalApproveConfirmBody =>
      'The next step will start, or the request will complete if this is the last step.';

  @override
  String get approvalRejectTitle => 'Reject request';

  @override
  String get approvalChangesTitle => 'Request changes';

  @override
  String get approvalApprovedToast => 'Approved';

  @override
  String get approvalRejectedToast => 'Rejected';

  @override
  String get approvalChangesToast => 'Changes requested';

  @override
  String approvalRule(String rule) {
    String _temp0 = intl.Intl.selectLogic(rule, {
      'ANY': 'Any named approver',
      'ALL': 'Every named approver',
      'other': '$rule',
    });
    return '$_temp0';
  }

  @override
  String get approvalStepPending => 'Waiting';

  @override
  String get approvalStepDone => 'Done';

  @override
  String get approvalNotApprover =>
      'You are not listed as an approver for the current step.';

  @override
  String get approvalWaitingDecision => 'Waiting for an approver.';

  @override
  String approvalAlreadyDecided(String status) {
    return 'This request is already $status.';
  }

  @override
  String approvalActionBy(String action, String name) {
    return '$action by $name';
  }

  @override
  String approvalActionLabel(String action) {
    String _temp0 = intl.Intl.selectLogic(action, {
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHANGES_REQUESTED': 'Changes requested',
      'other': '$action',
    });
    return '$_temp0';
  }

  @override
  String get navAudit => 'Audit log';

  @override
  String get auditTitle => 'Audit log';

  @override
  String get auditSubtitle =>
      'Every change, sign-in and permission update in your agency, newest first.';

  @override
  String get auditSearch => 'Search by person, action, record or request ID';

  @override
  String get auditEmpty => 'No activity recorded yet';

  @override
  String get auditEmptyBody =>
      'Actions taken in your workspace will be recorded here automatically.';

  @override
  String get auditStatLoaded => 'Loaded';

  @override
  String get auditStatFailures => 'Failures';

  @override
  String get auditStatActors => 'People';

  @override
  String get auditNoMatchesLoaded =>
      'Nothing in the loaded history matches. Load older events to search further back.';

  @override
  String get auditLoadMore => 'Load older events';

  @override
  String get auditLoadingMore => 'Loading older events';

  @override
  String get auditEnd => 'You have reached the beginning of the log';

  @override
  String auditResultCount(int shown, int failures) {
    String _temp0 = intl.Intl.pluralLogic(
      shown,
      locale: localeName,
      other: '$shown events',
      one: '1 event',
      zero: 'No events',
    );
    String _temp1 = intl.Intl.pluralLogic(
      failures,
      locale: localeName,
      other: ' · $failures failed',
      one: ' · 1 failed',
      zero: '',
    );
    return '$_temp0$_temp1';
  }

  @override
  String get auditFilters => 'Filters';

  @override
  String get auditFiltersBody => 'Filters apply to the events loaded so far.';

  @override
  String get auditClearFilters => 'Clear filters';

  @override
  String get auditApplyFilters => 'Show results';

  @override
  String get auditRangeLabel => 'Time range';

  @override
  String get auditRangeAll => 'All time';

  @override
  String auditRangeDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Last $days days',
      one: 'Last 24 hours',
    );
    return '$_temp0';
  }

  @override
  String get auditOutcomeLabel => 'Outcome';

  @override
  String auditOutcome(String outcome) {
    String _temp0 = intl.Intl.selectLogic(outcome, {
      'SUCCESS': 'Succeeded',
      'FAILURE': 'Failed',
      'other': '$outcome',
    });
    return '$_temp0';
  }

  @override
  String get auditActor => 'Performed by';

  @override
  String get auditActorId => 'Actor ID';

  @override
  String get auditActorTypeLabel => 'Actor type';

  @override
  String auditActorType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'user': 'Unknown person',
      'system': 'System',
      'service': 'Integration',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String get auditUnknownActor => 'Unknown person';

  @override
  String get auditAction => 'Action';

  @override
  String get auditEntity => 'Record';

  @override
  String get auditEntityId => 'Record ID';

  @override
  String get auditWhen => 'When';

  @override
  String get auditIp => 'IP address';

  @override
  String get auditUserAgent => 'Device';

  @override
  String get auditCorrelation => 'Request ID';

  @override
  String get auditCopy => 'Copy';

  @override
  String get auditCopied => 'Copied to clipboard';

  @override
  String get auditSectionEvent => 'Event';

  @override
  String get auditSectionRequest => 'Request';

  @override
  String get auditSectionChanges => 'Changes';

  @override
  String get auditSectionMetadata => 'Additional details';

  @override
  String get auditNoChanges =>
      'No before or after snapshot was recorded for this event.';

  @override
  String auditChangedFields(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count fields changed',
      one: '1 field changed',
      zero: 'No fields changed',
    );
    return '$_temp0';
  }

  @override
  String auditShowUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Show $count unchanged fields',
      one: 'Show 1 unchanged field',
    );
    return '$_temp0';
  }

  @override
  String get auditHideUnchanged => 'Hide unchanged fields';

  @override
  String get auditBefore => 'Before';

  @override
  String get auditAfter => 'After';

  @override
  String auditChangeKind(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'added': 'Added',
      'removed': 'Removed',
      'changed': 'Changed',
      'other': 'Unchanged',
    });
    return '$_temp0';
  }

  @override
  String auditEntityType(String type, String fallback) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'k_user': 'Person',
      'k_session': 'Session',
      'k_membership': 'Membership',
      'k_invitation': 'Invitation',
      'k_role': 'Role',
      'k_workspace': 'Workspace',
      'k_department': 'Department',
      'k_team': 'Team',
      'k_client': 'Client',
      'k_brand_kit': 'Brand kit',
      'k_project': 'Project',
      'k_task': 'Task',
      'k_lead': 'Lead',
      'k_invoice': 'Invoice',
      'k_article': 'Article',
      'k_reports': 'Report',
      'k_report': 'Report',
      'k_templates': 'Template',
      'k_template': 'Template',
      'k_automations': 'Automation',
      'k_automation': 'Automation',
      'k_automationVersion': 'Automation version',
      'k_automationRun': 'Automation run',
      'k_workflows': 'Workflow',
      'k_workflow': 'Workflow',
      'k_approvals': 'Approval',
      'k_approval': 'Approval',
      'k_feedbackThread': 'Feedback thread',
      'k_feedbackComment': 'Feedback comment',
      'k_contentVariant': 'Content variant',
      'k_metricSnapshot': 'Metric snapshot',
      'k_activity': 'Activity',
      'k_activityEvent': 'Activity',
      'k_notification': 'Notification',
      'k_notification_preference': 'Notification preference',
      'k_auth': 'Sign-in',
      'k_subscription': 'Subscription',
      'k_http_request': 'API request',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String auditVerb(String verb, String fallback) {
    String _temp0 = intl.Intl.selectLogic(verb, {
      'k_create': 'Created',
      'k_update': 'Updated',
      'k_delete': 'Deleted',
      'k_archive': 'Archived',
      'k_publish': 'Published',
      'k_run': 'Ran',
      'k_register': 'Signed up',
      'k_refresh': 'Session refreshed',
      'k_login': 'Signed in',
      'k_logout': 'Signed out',
      'k_login_failed': 'Sign-in failed',
      'k_profile_update': 'Profile updated',
      'k_role_change': 'Access level changed',
      'k_roles_assign': 'Roles assigned',
      'k_deactivate': 'Deactivated',
      'k_send': 'Invitation sent',
      'k_revoke': 'Revoked',
      'k_accept': 'Accepted',
      'k_request': 'Requested',
      'k_act': 'Responded',
      'k_transition': 'Status changed',
      'k_preference_update': 'Preferences updated',
      'k_device_register': 'Device registered',
      'k_device_remove': 'Device removed',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String get navAutomations => 'Automations';

  @override
  String get automationsTitle => 'Automations';

  @override
  String get automationsSearch => 'Search automations';

  @override
  String get automationsEmpty => 'No automations yet';

  @override
  String get automationsEmptyBody =>
      'Let routine work run itself — when something happens, do something useful. Start from a recipe or create your own.';

  @override
  String get automationNew => 'New automation';

  @override
  String get automationEdit => 'Edit automation';

  @override
  String get automationTabRules => 'Rules';

  @override
  String get automationTabRuns => 'Run history';

  @override
  String get automationName => 'Name';

  @override
  String get automationNameHint => 'e.g. Notify client when content is ready';

  @override
  String get automationTriggerField => 'When this happens';

  @override
  String get automationActionField => 'Do this';

  @override
  String get automationStatusField => 'Status';

  @override
  String get automationEnabledLabel => 'Turned on';

  @override
  String get automationEnabledHint =>
      'Paused automations keep their history and can be resumed any time.';

  @override
  String automationTrigger(String trigger) {
    String _temp0 = intl.Intl.selectLogic(trigger, {
      'content_submitted': 'content is sent for review',
      'content_approved': 'content is approved',
      'content_published': 'content is published',
      'task_overdue': 'a task becomes overdue',
      'invoice_overdue': 'an invoice becomes overdue',
      'lead_won': 'a lead is won',
      'inbox_negative': 'a negative message arrives',
      'other': '$trigger',
    });
    return '$_temp0';
  }

  @override
  String automationAction(String action) {
    String _temp0 = intl.Intl.selectLogic(action, {
      'notify_client': 'notify the client',
      'notify_team': 'notify the team',
      'create_task': 'create a task',
      'send_email': 'send an email',
      'post_webhook': 'post to a webhook',
      'other': '$action',
    });
    return '$_temp0';
  }

  @override
  String automationStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'ARCHIVED': 'Archived',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get automationWhen => 'When';

  @override
  String get automationThen => 'then';

  @override
  String automationSentence(String trigger, String action) {
    return 'When $trigger, then $action';
  }

  @override
  String automationToggle(String name) {
    return 'Turn $name on or off';
  }

  @override
  String get automationEnabledToast => 'Automation turned on';

  @override
  String get automationPausedToast => 'Automation paused';

  @override
  String get automationStatRuns => 'Runs';

  @override
  String get automationStatFailures => 'Failures';

  @override
  String get automationStatLastRun => 'Last run';

  @override
  String get automationNever => 'Never';

  @override
  String get automationNoRunsYet => 'Not run yet';

  @override
  String get automationSuccessRate => 'Success rate';

  @override
  String get automationKpiActive => 'Active';

  @override
  String automationKpiActiveOf(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'of $count total',
      one: 'of 1 total',
      zero: 'none set up',
    );
    return '$_temp0';
  }

  @override
  String get automationKpiRuns => 'Total runs';

  @override
  String get automationRecipesTitle => 'Start from a recipe';

  @override
  String get automationRecipeAdd => 'Add';

  @override
  String automationRecipeName(String recipe) {
    String _temp0 = intl.Intl.selectLogic(recipe, {
      'clientReview': 'Tell the client when content is ready',
      'approvalTask': 'Create a task after approval',
      'overdueAlert': 'Alert the team about overdue tasks',
      'dunning': 'Remind clients about overdue invoices',
      'welcome': 'Kick off onboarding when a deal is won',
      'escalate': 'Escalate negative comments',
      'other': '$recipe',
    });
    return '$_temp0';
  }

  @override
  String automationRecipeDescription(String recipe) {
    String _temp0 = intl.Intl.selectLogic(recipe, {
      'clientReview':
          'Notify the client as soon as a post is sent for approval.',
      'approvalTask': 'Schedule follow-up work the moment content is approved.',
      'overdueAlert': 'Nudge the team when a task slips past its due date.',
      'dunning': 'Email a polite reminder when an invoice is late.',
      'welcome': 'Create an onboarding task as soon as a lead is marked Won.',
      'escalate':
          'Post to your team channel when a conversation turns negative.',
      'other': '$recipe',
    });
    return '$_temp0';
  }

  @override
  String get automationFlowTitle => 'How it works';

  @override
  String get automationConfigTitle => 'Configuration';

  @override
  String get automationCreated => 'Created';

  @override
  String get automationUpdated => 'Last changed';

  @override
  String get automationRecentRuns => 'Recent runs';

  @override
  String get automationRunNow => 'Run now';

  @override
  String automationRunTitle(String name) {
    return 'Run $name';
  }

  @override
  String get automationRunDetail => 'Note';

  @override
  String get automationRunDetailHint =>
      'Saved with the run so the team knows why it ran.';

  @override
  String automationRunManualDetail(String name) {
    return 'Run manually: $name';
  }

  @override
  String automationRunDone(String name) {
    return '$name ran successfully';
  }

  @override
  String get automationPublish => 'Publish';

  @override
  String automationPublished(int version) {
    return 'Published as version $version';
  }

  @override
  String get automationDeleteBody =>
      'The automation stops running. Its run history is kept.';

  @override
  String get automationRunsSearch => 'Search runs';

  @override
  String automationRunsFailedOnly(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Failed only · $count',
      zero: 'Failed only',
    );
    return '$_temp0';
  }

  @override
  String get automationRunsEmpty => 'Nothing has run yet';

  @override
  String get automationRunsEmptyBody =>
      'Runs appear here every time an automation fires or is run by hand.';

  @override
  String get automationRunOk => 'Succeeded';

  @override
  String get automationRunFailed => 'Failed';

  @override
  String get automationRunDeleted => 'Deleted automation';

  @override
  String get navBilling => 'Plan & billing';

  @override
  String get billingTitle => 'Plan & billing';

  @override
  String get billingDescription =>
      'Your organisation\'s plan, limits and catalogue.';

  @override
  String get billingCurrentPlan => 'Current plan';

  @override
  String get billingNoSubscription => 'No active plan';

  @override
  String get billingNoSubscriptionBody =>
      'This organisation is not on a paid plan yet. Browse the catalogue below or contact support to get started.';

  @override
  String billingStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'TRIALING': 'Trial',
      'ACTIVE': 'Active',
      'PAST_DUE': 'Past due',
      'CANCELED': 'Canceled',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String billingInterval(String interval, String fallback) {
    String _temp0 = intl.Intl.selectLogic(interval, {
      'k_month': 'Monthly',
      'k_year': 'Yearly',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String billingLimit(String key, String fallback) {
    String _temp0 = intl.Intl.selectLogic(key, {
      'k_seats': 'Team seats',
      'k_clients': 'Clients',
      'k_channels': 'Channels',
      'k_storageKb': 'Storage',
      'k_automationRuns': 'Automation runs',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String billingFeature(String key, String fallback) {
    String _temp0 = intl.Intl.selectLogic(key, {
      'k_calendar': 'Calendar',
      'k_approvals': 'Approvals',
      'k_inbox': 'Inbox',
      'k_invoices': 'Invoices',
      'k_reports': 'Reports',
      'k_whiteLabel': 'White label',
      'k_support': 'Priority support',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String get billingUnlimited => 'Unlimited';

  @override
  String billingStorageGb(String value) {
    return '$value GB';
  }

  @override
  String billingPricePer(String price, String interval) {
    return '$price / $interval';
  }

  @override
  String get billingCustomPrice => 'Custom pricing';

  @override
  String get billingCharge => 'Charge';

  @override
  String get billingRenews => 'Renews';

  @override
  String get billingPeriodEnds => 'Period ends';

  @override
  String get billingTrialEnds => 'Trial ends';

  @override
  String billingDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days left',
      one: '1 day left',
      zero: 'Ends today',
    );
    return '$_temp0';
  }

  @override
  String get billingPeriodProgress => 'Billing period';

  @override
  String get billingLimits => 'Plan limits';

  @override
  String get billingFeatures => 'Included features';

  @override
  String get billingPlans => 'Plans';

  @override
  String get billingPlansEmpty => 'No plans available';

  @override
  String get billingPlansEmptyBody => 'The plan catalogue could not be loaded.';

  @override
  String get billingManagedNote =>
      'Plan changes are managed outside the mobile app. Contact your administrator or use the web app to upgrade or downgrade.';

  @override
  String billingYearlySaving(int percent) {
    return 'Save up to $percent% yearly';
  }

  @override
  String get billingCurrentBadge => 'Current';

  @override
  String billingLimitUpTo(String value) {
    return 'Up to $value';
  }

  @override
  String get billingInvoicesUnavailable =>
      'Invoice history is not available from the API yet.';

  @override
  String get navCalendar => 'Calendar';

  @override
  String get calendarTitle => 'Calendar';

  @override
  String get calendarToday => 'Today';

  @override
  String get calendarPreviousMonth => 'Previous month';

  @override
  String get calendarNextMonth => 'Next month';

  @override
  String get calendarModeMonth => 'Month';

  @override
  String get calendarModeUpcoming => 'Upcoming';

  @override
  String calendarSource(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'MANUAL': 'Event',
      'CONTENT': 'Content',
      'TASK': 'Task',
      'MEETING': 'Meeting',
      'DEADLINE': 'Deadline',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String calendarVisibility(String visibility) {
    String _temp0 = intl.Intl.selectLogic(visibility, {
      'INTERNAL': 'Internal only',
      'CLIENT_VISIBLE': 'Visible to client',
      'other': '$visibility',
    });
    return '$_temp0';
  }

  @override
  String get calendarDayEmpty => 'Nothing scheduled';

  @override
  String get calendarDayEmptyBody => 'Nothing is planned for this day yet.';

  @override
  String get calendarUpcomingEmpty => 'Nothing coming up';

  @override
  String get calendarUpcomingEmptyBody =>
      'Events, scheduled content and task deadlines will show up here.';

  @override
  String get calendarNoMatches => 'No items match these filters.';

  @override
  String calendarDaySemantics(String date, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
      zero: 'nothing scheduled',
    );
    return '$date, $_temp0';
  }

  @override
  String calendarDayCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
      zero: 'Nothing scheduled',
    );
    return '$_temp0';
  }

  @override
  String calendarMoreItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '+$count more',
    );
    return '$_temp0';
  }

  @override
  String get calendarAllDay => 'All day';

  @override
  String calendarTimeRange(String start, String end) {
    return '$start – $end';
  }

  @override
  String calendarUntil(String time) {
    return 'Until $time';
  }

  @override
  String get calendarNew => 'New event';

  @override
  String get calendarEdit => 'Edit event';

  @override
  String get calendarTitleLabel => 'Title';

  @override
  String get calendarTitleHint => 'e.g. Campaign kickoff call';

  @override
  String get calendarTypeLabel => 'Type';

  @override
  String get calendarStarts => 'Starts';

  @override
  String get calendarEnds => 'Ends';

  @override
  String get calendarEndBeforeStart => 'The end must be after the start.';

  @override
  String get calendarVisibilityLabel => 'Visibility';

  @override
  String get calendarClient => 'Client';

  @override
  String get calendarClientLocked =>
      'The client can\'t be changed after creation.';

  @override
  String get calendarProject => 'Project';

  @override
  String get calendarWhen => 'When';

  @override
  String get calendarFilterClient => 'Client';

  @override
  String get calendarFilterType => 'Type';

  @override
  String get calendarFiltersClear => 'Clear filters';

  @override
  String get calendarOpenTask => 'Open task';

  @override
  String get calendarOpenContent => 'Open content';

  @override
  String calendarOpenProject(String name) {
    return 'Open project $name';
  }

  @override
  String calendarOpenClient(String name) {
    return 'Open client $name';
  }

  @override
  String get calendarPartialSources =>
      'Some items couldn\'t be loaded. Pull to refresh to try again.';

  @override
  String get calendarItemDetails => 'Event details';

  @override
  String get navClients => 'Clients';

  @override
  String get clientsTitle => 'Clients';

  @override
  String get clientsSearch => 'Search clients';

  @override
  String get clientsEmpty => 'No clients yet';

  @override
  String get clientsEmptyBody =>
      'Add your first client to start planning work, content and invoices for them.';

  @override
  String get clientNew => 'New client';

  @override
  String get clientEdit => 'Edit client';

  @override
  String get clientName => 'Client name';

  @override
  String get clientLegalName => 'Legal name';

  @override
  String get clientIndustry => 'Industry';

  @override
  String get clientWebsite => 'Website';

  @override
  String get clientWebsiteHint => 'example.com';

  @override
  String get clientTier => 'Tier';

  @override
  String get clientStatusLabel => 'Status';

  @override
  String get clientStatusChange => 'Change status';

  @override
  String clientStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'ONBOARDING': 'Onboarding',
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'CHURNED': 'Churned',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get clientRetainer => 'Monthly retainer';

  @override
  String get clientSince => 'Client since';

  @override
  String get clientDetails => 'Details';

  @override
  String get clientContacts => 'Contacts';

  @override
  String get clientContactsEmpty => 'No contacts recorded for this client.';

  @override
  String get clientDecisionMaker => 'Decision maker';

  @override
  String clientEmailContact(String name) {
    return 'Email $name';
  }

  @override
  String clientCallContact(String name) {
    return 'Call $name';
  }

  @override
  String get clientTabOverview => 'Overview';

  @override
  String get clientTabBrand => 'Brand kit';

  @override
  String get clientTabProjects => 'Projects';

  @override
  String get clientProjectsEmpty => 'No projects for this client yet.';

  @override
  String get clientBrandColours => 'Colours';

  @override
  String get clientBrandEdit => 'Edit brand kit';

  @override
  String get clientBrandPrimary => 'Primary';

  @override
  String get clientBrandSecondary => 'Secondary';

  @override
  String get clientBrandAccent => 'Accent';

  @override
  String get clientBrandVoice => 'Voice & tone';

  @override
  String get clientBrandVoiceEmpty => 'No voice guidelines yet.';

  @override
  String get clientBrandPillars => 'Content pillars';

  @override
  String get clientBrandHashtags => 'Hashtags';

  @override
  String get clientBrandNone => 'None added yet.';

  @override
  String get clientStatAll => 'Clients';

  @override
  String get clientStatActive => 'Active';

  @override
  String get clientStatOnboarding => 'Onboarding';

  @override
  String get clientStatPaused => 'Paused';

  @override
  String get navContent => 'Content';

  @override
  String get contentTitle => 'Content';

  @override
  String get contentNew => 'New post';

  @override
  String get contentEditTitle => 'Edit post';

  @override
  String get contentTabLibrary => 'Library';

  @override
  String get contentTabPlanner => 'Planner';

  @override
  String get contentSearch => 'Search title, caption or hashtags';

  @override
  String get contentEmpty => 'No content yet';

  @override
  String get contentEmptyBody =>
      'Draft posts for your clients, send them for review and plan the feed.';

  @override
  String get contentUntitled => 'Untitled post';

  @override
  String contentStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'IN_REVIEW': 'In review',
      'CHANGES_REQUESTED': 'Changes requested',
      'APPROVED': 'Approved',
      'SCHEDULED': 'Scheduled',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String contentType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'POST': 'Post',
      'CAROUSEL': 'Carousel',
      'REEL': 'Reel',
      'STORY': 'Story',
      'VIDEO': 'Video',
      'ARTICLE': 'Article',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String contentPlatform(String platform) {
    String _temp0 = intl.Intl.selectLogic(platform, {
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'linkedin': 'LinkedIn',
      'x': 'X',
      'youtube': 'YouTube',
      'tiktok': 'TikTok',
      'other': '$platform',
    });
    return '$_temp0';
  }

  @override
  String contentPlatformNotConnected(String platform) {
    return '$platform · not connected';
  }

  @override
  String get contentFilterMine => 'Mine';

  @override
  String get contentFilterClient => 'Client';

  @override
  String get contentFilterType => 'Type';

  @override
  String get contentFilterPlatform => 'Platform';

  @override
  String contentScheduledFor(String date) {
    return 'Scheduled $date';
  }

  @override
  String get contentUnscheduled => 'Not scheduled';

  @override
  String contentUpdatedAgo(String time) {
    return 'Updated $time';
  }

  @override
  String contentSlidePosition(int current, int total) {
    return 'Slide $current of $total';
  }

  @override
  String get contentSlidePrevious => 'Previous slide';

  @override
  String get contentSlideNext => 'Next slide';

  @override
  String get contentPlannerPosts => 'Posts';

  @override
  String get contentPlannerPlanned => 'Planned';

  @override
  String get contentPlannerLive => 'Live';

  @override
  String get contentPlannerFeed => 'Feed';

  @override
  String get contentPlannerSaving => 'Saving order…';

  @override
  String get contentPlannerSaved => 'Feed order saved';

  @override
  String get contentPlannerHint =>
      'Long-press and drag a tile to rearrange the feed';

  @override
  String get contentPlannerEmpty => 'Pick a client to plan their feed';

  @override
  String get contentPlannerEmptyBody =>
      'The planner shows a client’s posts as they will appear on their profile grid.';

  @override
  String get contentPlannerMoveEarlier => 'Move earlier';

  @override
  String get contentPlannerMoveLater => 'Move later';

  @override
  String contentPlannerTile(String title, String status, int position) {
    return '$title, $status, position $position';
  }

  @override
  String get contentWorkflowTitle => 'Workflow';

  @override
  String contentWorkflowHint(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Finish the post, then submit it for review.',
      'IN_REVIEW': 'Waiting for a reviewer to approve or request changes.',
      'CHANGES_REQUESTED':
          'The reviewer asked for changes. Edit the post and resubmit it.',
      'APPROVED': 'Approved. Schedule it or publish it now.',
      'SCHEDULED': 'Scheduled to go out at the planned time.',
      'PUBLISHED': 'Published. This post can no longer be changed.',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String contentPipelineSemantics(String status, int step, int total) {
    return 'Workflow: $status, step $step of $total';
  }

  @override
  String get contentWaitingForReview =>
      'Waiting for someone with approval rights to review it.';

  @override
  String get contentActionApprove => 'Approve';

  @override
  String get contentActionRequestChanges => 'Request changes';

  @override
  String get contentActionReject => 'Reject';

  @override
  String get contentActionSubmit => 'Submit for review';

  @override
  String get contentActionWithdraw => 'Withdraw from review';

  @override
  String get contentActionSchedule => 'Schedule';

  @override
  String get contentActionUnschedule => 'Unschedule';

  @override
  String get contentActionPublish => 'Mark as published';

  @override
  String get contentActionBackToDraft => 'Back to draft';

  @override
  String contentMovedToast(String status) {
    return 'Moved to $status';
  }

  @override
  String get contentApprovedToast => 'Post approved';

  @override
  String get contentSubmittedToast => 'Sent for review';

  @override
  String get contentPublishConfirmTitle => 'Mark as published?';

  @override
  String get contentPublishConfirmBody =>
      'Published posts are locked and can no longer be edited.';

  @override
  String get contentScheduleTitle => 'Schedule post';

  @override
  String get contentRescheduleTitle => 'Change publish date';

  @override
  String get contentScheduleBody => 'Choose when this post should go out.';

  @override
  String contentReviewChangesTitle(String title) {
    return 'Request changes to “$title”';
  }

  @override
  String contentReviewRejectTitle(String title) {
    return 'Reject “$title”';
  }

  @override
  String get contentReviewChangesBody =>
      'The post goes back to its author with your note.';

  @override
  String get contentReviewRejectBody =>
      'The post goes back to draft. Tell the author why.';

  @override
  String get contentReviewNote => 'Note for the author';

  @override
  String get contentReviewNoteHint => 'What should change?';

  @override
  String get contentPreviewTitle => 'Preview';

  @override
  String get contentPreviewEmpty => 'The caption will appear here.';

  @override
  String contentPreviewSemantics(String platform) {
    return 'Post preview for $platform';
  }

  @override
  String contentPreviewTruncated(String platform, int limit) {
    return '$platform shows the first $limit characters; the rest is cut off.';
  }

  @override
  String get contentPublishedReadOnly => 'Published posts are read-only.';

  @override
  String get contentNotEditable => 'This post can’t be edited';

  @override
  String get contentLinkFailed => 'Couldn’t open the link';

  @override
  String get contentCommentsTitle => 'Comments';

  @override
  String contentCommentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count comments',
      one: '1 comment',
      zero: 'Comments',
    );
    return '$_temp0';
  }

  @override
  String get contentCommentsEmpty => 'No comments yet. Start the conversation.';

  @override
  String get contentCommentYou => 'You';

  @override
  String get contentCommentTeammate => 'Teammate';

  @override
  String get contentCommentLabel => 'Add a comment';

  @override
  String get contentCommentHint => 'Share feedback on this post';

  @override
  String get contentCommentSend => 'Send comment';

  @override
  String get contentCommentSent => 'Comment added';

  @override
  String get contentSectionBasics => 'Basics';

  @override
  String get contentSectionMedia => 'Media';

  @override
  String get contentSectionCopy => 'Caption & hashtags';

  @override
  String get contentSectionPublishing => 'Publishing';

  @override
  String get contentFieldClient => 'Client';

  @override
  String get contentFieldAuthor => 'Author';

  @override
  String get contentFieldTitle => 'Title';

  @override
  String get contentFieldTitleHint =>
      'Internal name, e.g. Spring launch teaser';

  @override
  String get contentFieldType => 'Format';

  @override
  String get contentFieldPlatforms => 'Platforms';

  @override
  String get contentFieldCaption => 'Caption';

  @override
  String get contentFieldCaptionHint => 'Write the post copy';

  @override
  String get contentFieldHashtags => 'Hashtags';

  @override
  String get contentFieldPillar => 'Content pillar';

  @override
  String get contentFieldPillarHint => 'e.g. Education, Behind the scenes';

  @override
  String get contentFieldCta => 'Call-to-action link';

  @override
  String get contentFieldCtaHint => 'https://';

  @override
  String get contentFieldScheduledAt => 'Publish date';

  @override
  String get contentFieldUpdated => 'Last updated';

  @override
  String get contentNoClients =>
      'You need access to at least one client to create content.';

  @override
  String get contentEditResetsApproval =>
      'Saving changes sends this post back to draft so it can be reviewed again.';

  @override
  String get contentOpenApproval => 'Open approval request';

  @override
  String get contentOpenApprovalBody =>
      'A formal approval is waiting for a decision on this post.';

  @override
  String get contentCtaInvalid =>
      'Enter a full link starting with http:// or https://';

  @override
  String contentCaptionCounter(int count, int limit) {
    return '$count / $limit characters';
  }

  @override
  String contentCaptionOver(int count, int limit) {
    return '$count / $limit characters · too long for the selected platforms';
  }

  @override
  String contentHashtagsCount(int count, int max) {
    return '$count of $max hashtags';
  }

  @override
  String contentHashtagsFull(int max) {
    return 'You can add up to $max hashtags';
  }

  @override
  String contentHashtagsAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Added $count hashtags',
      one: 'Added 1 hashtag',
      zero: 'No new hashtags',
    );
    return '$_temp0';
  }

  @override
  String contentBrandVoice(String voice) {
    return 'Brand voice: $voice';
  }

  @override
  String get contentBrandHashtags => 'Brand hashtags';

  @override
  String get contentBrandPillars => 'Brand pillars';

  @override
  String get contentAiWriteCaption => 'Write caption';

  @override
  String get contentAiSuggestHashtags => 'Suggest hashtags';

  @override
  String get contentAiNeedsTopic =>
      'Add a title or a few words first so AI knows what to write about';

  @override
  String get contentAiCaptionDone => 'Caption drafted';

  @override
  String get contentUndo => 'Undo';

  @override
  String get contentStatMedia => 'Media';

  @override
  String get contentMediaAdd => 'Add from library';

  @override
  String get contentMediaEmpty =>
      'No media yet. Add images or videos from the client’s library.';

  @override
  String contentMediaCount(int count, int max) {
    return '$count of $max files';
  }

  @override
  String contentMediaItem(int position, int total, String name) {
    return 'Slide $position of $total: $name';
  }

  @override
  String get contentMediaMoveEarlier => 'Move earlier';

  @override
  String get contentMediaMoveLater => 'Move later';

  @override
  String get contentMediaReorderHint => 'Long-press and drag to reorder slides';

  @override
  String get contentMediaPickClientFirst => 'Choose a client first';

  @override
  String get contentSaveDraft => 'Save draft';

  @override
  String get contentSaveAndSubmit => 'Save & submit';

  @override
  String get contentVersionConflict =>
      'Someone else changed this post while you were editing. Reload to get the latest version.';

  @override
  String get contentReloadLatest => 'Reload latest';

  @override
  String get contentStatAll => 'Posts';

  @override
  String get contentStatDraft => 'Drafts';

  @override
  String get contentStatReview => 'In review';

  @override
  String get contentStatScheduled => 'Scheduled';

  @override
  String get navCustomFields => 'Custom fields';

  @override
  String get customFieldsTitle => 'Custom fields';

  @override
  String get customFieldsSearch => 'Search fields, keys or options';

  @override
  String get customFieldsEmpty => 'No custom fields yet';

  @override
  String get customFieldsEmptyBody =>
      'Add the extra details your agency tracks on clients, projects, tasks, content and leads.';

  @override
  String get customFieldNew => 'New field';

  @override
  String get customFieldEdit => 'Edit field';

  @override
  String customFieldEntity(String entity) {
    String _temp0 = intl.Intl.selectLogic(entity, {
      'client': 'Clients',
      'project': 'Projects',
      'task': 'Tasks',
      'content': 'Content',
      'lead': 'Leads',
      'other': '$entity',
    });
    return '$_temp0';
  }

  @override
  String customFieldType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'TEXT': 'Text',
      'NUMBER': 'Number',
      'DATE': 'Date',
      'SELECT': 'Single choice',
      'MULTI_SELECT': 'Multiple choice',
      'BOOLEAN': 'Yes / no',
      'URL': 'Link',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String customFieldGroupTitle(String entity, int count) {
    return '$entity · $count';
  }

  @override
  String customFieldAddTo(String entity) {
    return 'Add a field to $entity';
  }

  @override
  String get customFieldLabelField => 'Label';

  @override
  String get customFieldLabelHint => 'e.g. Contract end date';

  @override
  String get customFieldKeyField => 'Key';

  @override
  String get customFieldKeyHint =>
      'Used in exports and integrations. Lowercase letters, numbers and underscores.';

  @override
  String get customFieldKeyLocked =>
      'The key cannot change once the field exists.';

  @override
  String get customFieldKeyInvalid =>
      'Start with a letter; use lowercase letters, numbers and underscores';

  @override
  String get customFieldEntityField => 'Applies to';

  @override
  String get customFieldTypeField => 'Field type';

  @override
  String get customFieldOptionsField => 'Options';

  @override
  String get customFieldOptionsRequired => 'Add at least one option';

  @override
  String get customFieldRequiredField => 'Required';

  @override
  String get customFieldRequiredHint =>
      'Records cannot be saved without a value.';

  @override
  String get customFieldFilterableField => 'Filterable';

  @override
  String get customFieldFilterableHint =>
      'Show this field as a filter in lists.';

  @override
  String get customFieldClientVisibleField => 'Visible to clients';

  @override
  String get customFieldClientVisibleHint =>
      'Clients see this field in their portal.';

  @override
  String get customFieldRequired => 'Required';

  @override
  String get customFieldFilterable => 'Filterable';

  @override
  String get customFieldClientVisible => 'Client visible';

  @override
  String customFieldMoreOptions(int count) {
    return '+$count';
  }

  @override
  String get customFieldStatTotal => 'Fields';

  @override
  String get customFieldStatRequired => 'Required';

  @override
  String get customFieldStatClientVisible => 'Client visible';

  @override
  String get dashboardKpiAria => 'Key metrics';

  @override
  String get dashboardKpiRetry => 'Couldn\'t load · tap to retry';

  @override
  String get dashboardKpiMyTasks => 'My open tasks';

  @override
  String dashboardKpiMyTasksCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count due this week',
      one: '1 due this week',
      zero: 'Nothing due this week',
    );
    return '$_temp0';
  }

  @override
  String get dashboardKpiDue => 'Due today & overdue';

  @override
  String dashboardKpiDueCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count overdue',
      one: '1 overdue',
      zero: 'Nothing overdue',
    );
    return '$_temp0';
  }

  @override
  String get dashboardKpiInReview => 'Content in review';

  @override
  String dashboardKpiInReviewCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count need changes',
      one: '1 needs changes',
      zero: 'No changes requested',
    );
    return '$_temp0';
  }

  @override
  String get dashboardKpiApprovals => 'Approvals pending';

  @override
  String dashboardKpiApprovalsCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count past due',
      one: '1 past due',
      zero: 'All on schedule',
    );
    return '$_temp0';
  }

  @override
  String get dashboardKpiOutstanding => 'Outstanding invoices';

  @override
  String dashboardKpiOutstandingCaption(String amount) {
    return '$amount overdue';
  }

  @override
  String get dashboardKpiOutstandingClear => 'Nothing overdue';

  @override
  String get dashboardKpiClients => 'Active clients';

  @override
  String dashboardKpiClientsCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count onboarding',
      one: '1 onboarding',
      zero: 'None onboarding',
    );
    return '$_temp0';
  }

  @override
  String get dashboardQuickActions => 'Quick actions';

  @override
  String get dashboardQuickNewTask => 'New task';

  @override
  String get dashboardQuickNewPost => 'New post';

  @override
  String get dashboardQuickNewClient => 'New client';

  @override
  String get dashboardQuickLogTime => 'Log time';

  @override
  String get dashboardEmptyTitle => 'Your home is quiet';

  @override
  String get dashboardEmptyBody =>
      'Nothing is available for your role yet. Ask an admin if you expected to see work here.';

  @override
  String get dashboardMyWorkTitle => 'My work';

  @override
  String get dashboardMyWorkEmpty =>
      'You are all caught up. Nothing assigned to you is open.';

  @override
  String get dashboardApprovalsTitle => 'Awaiting approval';

  @override
  String get dashboardApprovalsEmpty => 'Nothing is waiting for approval.';

  @override
  String dashboardApprovalSubject(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'CONTENT': 'Content approval',
      'CLIENT': 'Client approval',
      'other': 'Approval request',
    });
    return '$_temp0';
  }

  @override
  String dashboardRequested(String when) {
    return 'Requested $when';
  }

  @override
  String get dashboardUpcomingTitle => 'Upcoming';

  @override
  String dashboardUpcomingEmpty(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Nothing scheduled in the next $days days.',
      one: 'Nothing scheduled for tomorrow.',
    );
    return '$_temp0';
  }

  @override
  String dashboardUpcomingKind(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'CONTENT': 'Post',
      'TASK': 'Task',
      'MEETING': 'Meeting',
      'DEADLINE': 'Deadline',
      'other': 'Event',
    });
    return '$_temp0';
  }

  @override
  String get dashboardAllDay => 'All day';

  @override
  String get dashboardPipelineTitle => 'Pipeline snapshot';

  @override
  String get dashboardPipelineEmpty => 'No open leads yet.';

  @override
  String dashboardPipelineCaption(String amount) {
    return '$amount still to win';
  }

  @override
  String dashboardDealCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count deals',
      one: '1 deal',
      zero: 'No deals',
    );
    return '$_temp0';
  }

  @override
  String get dashboardRevenueTitle => 'Revenue';

  @override
  String dashboardRevenueCaption(int months) {
    String _temp0 = intl.Intl.pluralLogic(
      months,
      locale: localeName,
      other: 'Paid in the last $months months',
      one: 'Paid this month',
    );
    return '$_temp0';
  }

  @override
  String dashboardRevenueEmpty(int months) {
    String _temp0 = intl.Intl.pluralLogic(
      months,
      locale: localeName,
      other: 'No payments in the last $months months.',
      one: 'No payments this month.',
    );
    return '$_temp0';
  }

  @override
  String dashboardRevenueChart(String summary) {
    return 'Paid per month: $summary';
  }

  @override
  String get dashboardActivityTitle => 'Recent activity';

  @override
  String get dashboardActivityEmpty =>
      'Nothing has happened yet. Actions across the workspace appear here.';

  @override
  String get dashboardActivitySystem => 'System';

  @override
  String get dashboardActivitySomeone => 'Someone';

  @override
  String dashboardTaskStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'TODO': 'To do',
      'IN_PROGRESS': 'In progress',
      'IN_REVIEW': 'In review',
      'DONE': 'Done',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardContentStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'IN_REVIEW': 'In review',
      'CHANGES_REQUESTED': 'Changes requested',
      'APPROVED': 'Approved',
      'SCHEDULED': 'Scheduled',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardApprovalStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHANGES_REQUESTED': 'Changes requested',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardInvoiceStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'OVERDUE': 'Overdue',
      'VOID': 'Void',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardReportStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'READY': 'Ready',
      'SENT': 'Sent',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardClientStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'ONBOARDING': 'Onboarding',
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'CHURNED': 'Churned',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardProjectStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PLANNING': 'Planning',
      'ACTIVE': 'Active',
      'ON_HOLD': 'On hold',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String dashboardLeadStage(String stage) {
    String _temp0 = intl.Intl.selectLogic(stage, {
      'NEW': 'New',
      'CONTACTED': 'Contacted',
      'PROPOSAL': 'Proposal',
      'NEGOTIATION': 'Negotiation',
      'WON': 'Won',
      'LOST': 'Lost',
      'other': '$stage',
    });
    return '$_temp0';
  }

  @override
  String get navDepartments => 'Departments';

  @override
  String get departmentsTitle => 'Departments';

  @override
  String get departmentsSearch => 'Search departments';

  @override
  String get departmentsEmpty => 'No departments yet';

  @override
  String get departmentsEmptyBody =>
      'Group your agency into departments like Creative or Accounts to organise access and reporting.';

  @override
  String get departmentNew => 'New department';

  @override
  String get departmentAddSub => 'Add sub-department';

  @override
  String get departmentName => 'Department name';

  @override
  String get departmentNameHint => 'e.g. Creative';

  @override
  String get departmentParent => 'Parent department';

  @override
  String get departmentParentNone =>
      'This department will sit at the top level.';

  @override
  String departmentParentHint(String path) {
    return 'It will sit under $path.';
  }

  @override
  String departmentPositions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count positions',
      one: '1 position',
      zero: 'No positions',
    );
    return '$_temp0';
  }

  @override
  String get departmentPositionsLabel => 'Positions';

  @override
  String get departmentPositionsEmpty =>
      'No positions defined in this department yet.';

  @override
  String departmentSubCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count sub-departments',
      one: '1 sub-department',
    );
    return '$_temp0';
  }

  @override
  String get departmentSubDepartments => 'Sub-departments';

  @override
  String departmentTopLevel(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count top level',
      one: '1 top level',
    );
    return '$_temp0';
  }

  @override
  String get departmentCreated => 'Created';

  @override
  String get departmentExpand => 'Expand';

  @override
  String get departmentCollapse => 'Collapse';

  @override
  String get departmentExpandAll => 'Expand all';

  @override
  String get departmentCollapseAll => 'Collapse all';

  @override
  String get departmentTeamNew => 'New team';

  @override
  String get departmentTeamBody =>
      'Teams group people who work together across departments, such as a client pod.';

  @override
  String get departmentTeamName => 'Team name';

  @override
  String get departmentTeamNameHint => 'e.g. Retail pod';

  @override
  String get departmentTeamDescription => 'Description (optional)';

  @override
  String get departmentTeamCreated => 'Team created';

  @override
  String get navInbox => 'Inbox';

  @override
  String get inboxTitle => 'Inbox';

  @override
  String get inboxSearch => 'Search author or message';

  @override
  String get inboxEmpty => 'Inbox zero';

  @override
  String get inboxEmptyBody =>
      'Comments, DMs and mentions from your clients\' channels will land here.';

  @override
  String get inboxStatOpen => 'Open';

  @override
  String get inboxStatOpenHint => 'Needs a reply';

  @override
  String get inboxStatUrgent => 'Urgent';

  @override
  String get inboxStatUrgentHint => 'High or urgent priority';

  @override
  String get inboxStatMine => 'Mine';

  @override
  String get inboxStatMineHint => 'Assigned to you';

  @override
  String inboxStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'OPEN': 'Open',
      'REPLIED': 'Replied',
      'ARCHIVED': 'Archived',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String inboxType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'COMMENT': 'Comment',
      'DM': 'Direct message',
      'MENTION': 'Mention',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String inboxSentiment(String sentiment) {
    String _temp0 = intl.Intl.selectLogic(sentiment, {
      'POSITIVE': 'Positive',
      'NEUTRAL': 'Neutral',
      'NEGATIVE': 'Negative',
      'other': 'Not rated',
    });
    return '$_temp0';
  }

  @override
  String inboxPriority(String priority) {
    String _temp0 = intl.Intl.selectLogic(priority, {
      'LOW': 'Low',
      'NORMAL': 'Normal',
      'HIGH': 'High',
      'URGENT': 'Urgent',
      'other': '$priority',
    });
    return '$_temp0';
  }

  @override
  String inboxPlatform(String platform) {
    String _temp0 = intl.Intl.selectLogic(platform, {
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'linkedin': 'LinkedIn',
      'x': 'X',
      'youtube': 'YouTube',
      'tiktok': 'TikTok',
      'other': '$platform',
    });
    return '$_temp0';
  }

  @override
  String get inboxFilterType => 'Type';

  @override
  String get inboxFilterSentiment => 'Sentiment';

  @override
  String get inboxFilterPriority => 'Priority';

  @override
  String get inboxFilterClient => 'Client';

  @override
  String get inboxFilterMine => 'Assigned to me';

  @override
  String get inboxClearFilters => 'Clear filters';

  @override
  String get inboxUnknownAuthor => 'Unknown author';

  @override
  String get inboxNoPreview => 'No message text';

  @override
  String get inboxSelectTitle => 'Select a conversation';

  @override
  String get inboxSelectBody =>
      'Pick a message to read the thread, triage it and reply.';

  @override
  String get inboxMetaClient => 'Client';

  @override
  String get inboxMetaReceived => 'Received';

  @override
  String get inboxMetaSentiment => 'Sentiment';

  @override
  String get inboxMetaPriority => 'Priority';

  @override
  String get inboxMetaAssignee => 'Assignee';

  @override
  String inboxPriorityValue(String priority) {
    return 'Priority: $priority';
  }

  @override
  String get inboxChangeStatus => 'Change status';

  @override
  String get inboxChangeSentiment => 'Change sentiment';

  @override
  String get inboxChangePriority => 'Change priority';

  @override
  String get inboxChangeAssignee => 'Change assignee';

  @override
  String get inboxAssignMe => 'Assign to me';

  @override
  String get inboxUnassign => 'Unassign';

  @override
  String get inboxArchive => 'Archive';

  @override
  String get inboxReopen => 'Reopen';

  @override
  String get inboxArchivedToast => 'Conversation archived';

  @override
  String get inboxReopenedToast => 'Conversation reopened';

  @override
  String inboxReplyHint(String name) {
    return 'Reply to $name…';
  }

  @override
  String get inboxReplySend => 'Send reply';

  @override
  String get inboxReplySent => 'Reply sent';

  @override
  String get inboxReplyReadOnly =>
      'Your role can read this conversation but not reply to it.';

  @override
  String get inboxMessagesEmpty => 'No messages in this thread yet.';

  @override
  String get inboxSending => 'Sending…';

  @override
  String inboxCharacterCount(int count, int max) {
    return '$count / $max';
  }

  @override
  String get inboxYou => 'You';

  @override
  String get inboxTeam => 'Team';

  @override
  String get inboxToday => 'Today';

  @override
  String get inboxYesterday => 'Yesterday';

  @override
  String inboxMessageLabel(String author, String time, String body) {
    return '$author, $time: $body';
  }

  @override
  String inboxRowLabel(String author, String status, String time) {
    return '$author, $status, $time';
  }

  @override
  String get navIntegrations => 'Integrations';

  @override
  String get integrationsTitle => 'Integrations';

  @override
  String get integrationsSearch => 'Search providers, handles or clients';

  @override
  String get integrationsEmpty => 'No connections yet';

  @override
  String get integrationsEmptyBody =>
      'Connect provider accounts so publishing, inbox and reports stay in sync.';

  @override
  String integrationStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING': 'Pending',
      'CONNECTED': 'Connected',
      'DISCONNECTED': 'Disconnected',
      'ERROR': 'Error',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get integrationStatusField => 'Status';

  @override
  String integrationProviderFallback(String id) {
    return 'Provider $id';
  }

  @override
  String get integrationOrgWide => 'Whole agency';

  @override
  String integrationLastSync(String when) {
    return 'Synced $when';
  }

  @override
  String get integrationNeverSynced => 'Never synced';

  @override
  String integrationSince(String date) {
    return 'Since $date';
  }

  @override
  String get integrationConnect => 'Connect account';

  @override
  String get integrationConnectSubmit => 'Connect';

  @override
  String get integrationEdit => 'Edit connection';

  @override
  String get integrationKnownProviders => 'Providers already in use';

  @override
  String get integrationProviderId => 'Provider ID';

  @override
  String get integrationProviderIdHint =>
      'The provider\'s identifier from your integration settings.';

  @override
  String get integrationProviderIdInvalid => 'Enter a valid provider ID';

  @override
  String get integrationProviderName => 'Provider name';

  @override
  String get integrationProviderNameHint => 'e.g. Meta';

  @override
  String get integrationClient => 'Client';

  @override
  String get integrationHandle => 'Account handle';

  @override
  String get integrationHandleHint => 'e.g. @lumencoffee';

  @override
  String get integrationCreatedToast =>
      'Connection added — it stays pending until the provider confirms it';

  @override
  String get integrationMarkConnected => 'Mark as connected';

  @override
  String get integrationDisconnect => 'Disconnect';

  @override
  String integrationDisconnectTitle(String provider) {
    return 'Disconnect $provider?';
  }

  @override
  String get integrationDisconnectBody =>
      'Publishing and syncing stop for this account. Past content stays, and you can reconnect later.';

  @override
  String integrationConnectedToast(String provider) {
    return '$provider connected';
  }

  @override
  String integrationDisconnectedToast(String provider) {
    return '$provider disconnected';
  }

  @override
  String get integrationKpiConnected => 'Connected';

  @override
  String get integrationKpiIssues => 'Needs attention';

  @override
  String get integrationKpiPending => 'Pending';

  @override
  String get navInvoices => 'Invoices';

  @override
  String get invoicesTitle => 'Invoices';

  @override
  String get invoicesSearch => 'Search by number or client';

  @override
  String get invoicesEmpty => 'No invoices yet';

  @override
  String get invoicesEmptyBody =>
      'Create your first invoice to bill a client and track what is outstanding.';

  @override
  String get invoicesEmptyPortalBody =>
      'Invoices from your agency will appear here once they are sent.';

  @override
  String get invoiceNew => 'New invoice';

  @override
  String get invoiceEdit => 'Edit invoice';

  @override
  String invoiceEditTitle(String number) {
    return 'Edit $number';
  }

  @override
  String get invoiceClient => 'Client';

  @override
  String get invoiceClientUnknown => 'Client';

  @override
  String invoiceFilterValue(String label, String value) {
    return '$label: $value';
  }

  @override
  String invoiceStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'OVERDUE': 'Overdue',
      'VOID': 'Void',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get invoiceStatusLabel => 'Status';

  @override
  String get invoiceStatusDraftHint => 'Save privately and send it later.';

  @override
  String get invoiceStatusSentHint =>
      'Issue it now; it can no longer be edited.';

  @override
  String invoiceCardSemantics(
    String number,
    String client,
    String status,
    String total,
  ) {
    return 'Invoice $number for $client, $status, $total';
  }

  @override
  String invoiceIssuedOn(String date) {
    return 'Issued $date';
  }

  @override
  String invoiceCreatedOn(String date) {
    return 'Created $date';
  }

  @override
  String get invoiceSummaryOutstanding => 'Outstanding';

  @override
  String get invoiceSummaryOverdue => 'Overdue';

  @override
  String get invoiceSummaryPaidThisMonth => 'Paid this month';

  @override
  String get invoiceSummaryDrafts => 'Drafts';

  @override
  String invoiceCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count invoices',
      one: '1 invoice',
    );
    return '$_temp0';
  }

  @override
  String get invoiceDocumentTitle => 'Invoice';

  @override
  String get invoiceBillTo => 'Bill to';

  @override
  String get invoiceIssued => 'Issued';

  @override
  String get invoiceNotIssued => 'Not issued yet';

  @override
  String get invoiceDue => 'Due date';

  @override
  String get invoicePaid => 'Paid';

  @override
  String invoiceLineItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count line items',
      one: '1 line item',
      zero: 'Line items',
    );
    return '$_temp0';
  }

  @override
  String get invoiceNoLines => 'This invoice has no line items.';

  @override
  String get invoiceLineDescription => 'Description';

  @override
  String get invoiceLineQuantity => 'Qty';

  @override
  String get invoiceLineUnitPrice => 'Unit price';

  @override
  String get invoiceLineAmount => 'Amount';

  @override
  String invoiceLineQuantityTimesUnit(String quantity, String unit) {
    return '$quantity × $unit';
  }

  @override
  String invoiceLineSemantics(
    String description,
    int quantity,
    String unit,
    String amount,
  ) {
    return '$description: $quantity at $unit, $amount';
  }

  @override
  String invoiceLinePosition(int position, int count) {
    return 'Line $position of $count';
  }

  @override
  String get invoiceLineAdd => 'Add line';

  @override
  String get invoiceLineRemove => 'Remove line';

  @override
  String get invoiceLineMoveUp => 'Move line up';

  @override
  String get invoiceLineMoveDown => 'Move line down';

  @override
  String invoiceLinesFull(int max) {
    return 'Up to $max lines';
  }

  @override
  String get invoiceSubtotal => 'Subtotal';

  @override
  String invoiceTax(String rate) {
    return 'Tax ($rate%)';
  }

  @override
  String get invoiceTotal => 'Total';

  @override
  String invoiceTotalsSemantics(String subtotal, String tax, String total) {
    return 'Subtotal $subtotal, tax $tax, total $total';
  }

  @override
  String get invoiceCopyNumber => 'Copy number';

  @override
  String get invoiceCopied => 'Invoice number copied';

  @override
  String get invoiceShare => 'Copy summary';

  @override
  String get invoiceSummaryCopied => 'Invoice summary copied';

  @override
  String invoiceShareText(
    String number,
    String client,
    String total,
    String due,
  ) {
    return 'Invoice $number for $client: $total, due $due';
  }

  @override
  String invoiceTransitionAction(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'SENT': 'Mark as sent',
      'PAID': 'Mark as paid',
      'VOID': 'Void invoice',
      'other': 'Update status',
    });
    return '$_temp0';
  }

  @override
  String invoiceTransitionDone(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'SENT': 'Invoice sent',
      'PAID': 'Payment recorded',
      'VOID': 'Invoice voided',
      'other': 'Status updated',
    });
    return '$_temp0';
  }

  @override
  String invoiceTransitionConfirmTitle(String status, String number) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PAID': 'Mark $number as paid?',
      'VOID': 'Void $number?',
      'other': 'Update $number?',
    });
    return '$_temp0';
  }

  @override
  String invoiceTransitionConfirmBody(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PAID': 'A payment for the full total is recorded today.',
      'VOID':
          'A void invoice stays on record but can no longer be paid or edited.',
      'other': 'The invoice status will change.',
    });
    return '$_temp0';
  }

  @override
  String get invoiceNotEditable => 'Only drafts can be edited';

  @override
  String get invoiceNotEditableBody =>
      'Once an invoice is sent it becomes a financial record. Void it and create a new one instead.';

  @override
  String get invoiceBackToInvoice => 'Back to invoice';

  @override
  String get invoiceDetailsSection => 'Details';

  @override
  String get invoiceSummarySection => 'Summary';

  @override
  String get invoiceNumber => 'Invoice number';

  @override
  String get invoiceNumberHint => 'Suggested from your numbering sequence';

  @override
  String get invoiceNumberLocked => 'The number cannot change after creation';

  @override
  String get invoiceNumberTaken => 'That invoice number is already in use.';

  @override
  String get invoiceTaxRate => 'Tax rate';

  @override
  String invoiceTaxRateRange(int max) {
    return 'Use a rate from 0 to $max';
  }

  @override
  String invoiceDecimalsMax(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Use at most $count decimals',
      one: 'Use at most 1 decimal',
    );
    return '$_temp0';
  }

  @override
  String invoiceQuantityRange(int max) {
    return 'Use a whole number from 1 to $max';
  }

  @override
  String get invoiceAmountInvalid => 'Enter a valid amount';

  @override
  String get invoiceTotalTooLarge => 'The invoice total is too large.';

  @override
  String get invoiceCreateAndSend => 'Create and send';

  @override
  String get invoiceSaveDraft => 'Save draft';

  @override
  String get invoiceFormHint =>
      'Amounts are in the invoice currency. Tax is calculated once on the subtotal.';

  @override
  String get navKnowledge => 'Knowledge base';

  @override
  String get knowledgeTitle => 'Knowledge base';

  @override
  String get knowledgeSearch => 'Search articles';

  @override
  String get knowledgeEmpty => 'No articles yet';

  @override
  String get knowledgeEmptyBody =>
      'Write down how your agency works — SOPs, playbooks and policies — so everyone does it the same way.';

  @override
  String get knowledgeNew => 'New article';

  @override
  String get knowledgeEdit => 'Edit article';

  @override
  String get knowledgePublish => 'Publish';

  @override
  String get knowledgePublishedToast => 'Article published';

  @override
  String knowledgeCategory(String category) {
    String _temp0 = intl.Intl.selectLogic(category, {
      'SOP': 'SOP',
      'PLAYBOOK': 'Playbook',
      'TEMPLATE': 'Template',
      'POLICY': 'Policy',
      'ONBOARDING': 'Onboarding',
      'other': '$category',
    });
    return '$_temp0';
  }

  @override
  String get knowledgeCategoryField => 'Category';

  @override
  String get knowledgeTitleField => 'Title';

  @override
  String get knowledgeTitleHint => 'e.g. How we onboard a new client';

  @override
  String get knowledgeBodyField => 'Article';

  @override
  String get knowledgeBodyHint =>
      'Leave a blank line between paragraphs. A block of several lines becomes a checklist.';

  @override
  String get knowledgeWrite => 'Write';

  @override
  String get knowledgePreview => 'Preview';

  @override
  String get knowledgePreviewEmpty => 'Nothing to preview yet.';

  @override
  String get knowledgeBodyEmpty => 'This article has no content yet.';

  @override
  String knowledgeReadTime(int minutes) {
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: '$minutes min read',
      one: '1 min read',
    );
    return '$_temp0';
  }

  @override
  String knowledgeByAuthor(String name, String when) {
    return '$name · $when';
  }

  @override
  String knowledgeUpdated(String when) {
    return 'Updated $when';
  }

  @override
  String knowledgeVersionFooter(int version, String date) {
    return 'Version $version · First written $date';
  }

  @override
  String get knowledgeStatArticles => 'Articles';

  @override
  String get knowledgeStatCategories => 'Categories';

  @override
  String get knowledgeStatReading => 'Total read time';

  @override
  String get navLeads => 'Pipeline';

  @override
  String get leadsTitle => 'Pipeline';

  @override
  String get leadsSearch => 'Search company or contact';

  @override
  String get leadsEmpty => 'No leads yet';

  @override
  String get leadsEmptyBody =>
      'Add prospects to track every deal from first contact to signed client.';

  @override
  String get leadsViewBoard => 'Show board';

  @override
  String get leadsViewList => 'Show list';

  @override
  String get leadsStatOpen => 'Open pipeline';

  @override
  String get leadsStatOpenHint => 'Deals in progress';

  @override
  String get leadsStatForecast => 'Weighted forecast';

  @override
  String get leadsStatForecastHint => 'Open value × stage probability';

  @override
  String get leadsStatWon => 'Won';

  @override
  String leadsStatWonHint(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count deals won',
      one: '1 deal won',
      zero: 'No deals won yet',
    );
    return '$_temp0';
  }

  @override
  String get leadsStatWinRate => 'Win rate';

  @override
  String get leadsStatWinRateHint => 'Won ÷ closed deals';

  @override
  String leadsColumnSummary(int count, String value) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count leads',
      one: '1 lead',
      zero: 'No leads',
    );
    return '$_temp0 · $value';
  }

  @override
  String get leadsColumnEmpty => 'No leads in this stage';

  @override
  String leadsColumnDrop(String stage) {
    return 'Drop here to move to $stage';
  }

  @override
  String get leadsFilterOwner => 'Owner';

  @override
  String get leadsFilterOwnerMe => 'Me';

  @override
  String get leadsFilterFollowUp => 'Follow-up due';

  @override
  String get leadsClearFilters => 'Clear filters';

  @override
  String get leadNew => 'New lead';

  @override
  String get leadEdit => 'Edit lead';

  @override
  String get leadDelete => 'Delete lead';

  @override
  String leadStage(String stage) {
    String _temp0 = intl.Intl.selectLogic(stage, {
      'NEW': 'New',
      'CONTACTED': 'Contacted',
      'PROPOSAL': 'Proposal',
      'NEGOTIATION': 'Negotiation',
      'WON': 'Won',
      'LOST': 'Lost',
      'other': '$stage',
    });
    return '$_temp0';
  }

  @override
  String get leadStageLabel => 'Stage';

  @override
  String leadStageProgress(int current, int total) {
    return 'Stage $current of $total';
  }

  @override
  String get leadMoveTo => 'Move to stage';

  @override
  String leadMovedToast(String stage) {
    return 'Moved to $stage';
  }

  @override
  String leadAdvance(String stage) {
    return 'Advance to $stage';
  }

  @override
  String leadStepBack(String stage) {
    return 'Back to $stage';
  }

  @override
  String get leadMarkWon => 'Mark won';

  @override
  String get leadMarkLost => 'Mark lost';

  @override
  String get leadReopen => 'Reopen deal';

  @override
  String get leadCompany => 'Company';

  @override
  String get leadCompanyHint => 'Acme Studio';

  @override
  String get leadContact => 'Contact name';

  @override
  String get leadEmail => 'Contact email';

  @override
  String get leadIndustry => 'Industry';

  @override
  String get leadWebsite => 'Website';

  @override
  String get leadWebsiteHint => 'example.com';

  @override
  String get leadSource => 'Source';

  @override
  String get leadSourceHint => 'Referral, website, event…';

  @override
  String get leadValue => 'Estimated value';

  @override
  String leadValueHint(String currency) {
    return 'Amount in $currency';
  }

  @override
  String get leadValueInvalid => 'Enter an amount of zero or more';

  @override
  String get leadOwner => 'Owner';

  @override
  String get leadNextStep => 'Next step';

  @override
  String get leadNextStepHint => 'Send proposal, book a call…';

  @override
  String get leadNextStepAt => 'Next step date';

  @override
  String get leadNextStepEdit => 'Edit next step';

  @override
  String get leadNextStepEmpty =>
      'No next step planned. Add one so the deal keeps moving.';

  @override
  String get leadProbability => 'Win probability';

  @override
  String get leadWeightedValue => 'Weighted value';

  @override
  String get leadDetails => 'Details';

  @override
  String get leadContactSection => 'Contact';

  @override
  String leadEmailContact(String name) {
    return 'Email $name';
  }

  @override
  String get leadCreated => 'Created';

  @override
  String get leadUpdated => 'Last updated';

  @override
  String get leadConverted => 'Converted to client';

  @override
  String get leadOpenClient => 'Open client';

  @override
  String leadCardLabel(String company, String stage, String value) {
    return '$company, $stage, $value';
  }

  @override
  String get navMedia => 'Assets';

  @override
  String get mediaTitle => 'Assets';

  @override
  String get mediaSearch => 'Search files';

  @override
  String get mediaEmpty => 'No files yet';

  @override
  String get mediaEmptyBody =>
      'Upload images, videos and documents to share them with your team and use them in posts.';

  @override
  String get mediaUpload => 'Upload';

  @override
  String get mediaFilterClient => 'Client';

  @override
  String mediaKind(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'image': 'Images',
      'video': 'Videos',
      'document': 'Documents',
      'other': '$kind',
    });
    return '$_temp0';
  }

  @override
  String mediaStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING_UPLOAD': 'Uploading',
      'READY': 'Ready',
      'FAILED': 'Failed',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String mediaTileSemantics(String name, String kind, String status) {
    return '$name, $kind, $status';
  }

  @override
  String mediaUploadedToast(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count files uploaded',
      one: '1 file uploaded',
    );
    return '$_temp0';
  }

  @override
  String mediaUploadInProgress(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count uploads in progress',
      one: '1 upload in progress',
    );
    return '$_temp0';
  }

  @override
  String get mediaUploadPickTitle => 'Choose files to upload';

  @override
  String mediaUploadClientTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Upload $count files',
      one: 'Upload 1 file',
    );
    return '$_temp0';
  }

  @override
  String get mediaUploadClientBody =>
      'Files are filed under a client so they can be used in that client’s posts.';

  @override
  String get mediaUploadStart => 'Start upload';

  @override
  String get mediaUploadTitle => 'Uploads';

  @override
  String mediaUploadProgress(int done, int total) {
    return '$done of $total uploaded';
  }

  @override
  String mediaUploadSummary(int done, int failed) {
    String _temp0 = intl.Intl.pluralLogic(
      failed,
      locale: localeName,
      other: '$done uploaded, $failed failed',
      zero: '$done uploaded',
    );
    return '$_temp0';
  }

  @override
  String get mediaUploadRetryAll => 'Retry failed';

  @override
  String get mediaUploadHide => 'Hide';

  @override
  String get mediaUploadQueued => 'Waiting';

  @override
  String get mediaUploadSending => 'Uploading';

  @override
  String get mediaUploadFinishing => 'Finishing';

  @override
  String get mediaUploadDone => 'Done';

  @override
  String get mediaUploadFailed => 'Failed';

  @override
  String mediaUploadPercent(int percent) {
    return '$percent%';
  }

  @override
  String mediaUploadBytes(String sent, String total) {
    return '$sent of $total';
  }

  @override
  String get mediaUploadErrorEmpty => 'This file is empty.';

  @override
  String mediaUploadErrorNameTooLong(int max) {
    return 'File names can be at most $max characters.';
  }

  @override
  String get mediaUploadErrorType => 'This file type isn’t allowed.';

  @override
  String get mediaUploadErrorSize =>
      'This file is larger than the upload limit.';

  @override
  String get mediaUploadErrorIncomplete =>
      'The upload didn’t finish. Try again.';

  @override
  String get mediaEditTitle => 'Edit file details';

  @override
  String get mediaDeleteBody =>
      'The file is removed from the library and from any posts that use it.';

  @override
  String get mediaFieldName => 'Name';

  @override
  String get mediaFieldClient => 'Client';

  @override
  String get mediaFieldKind => 'Kind';

  @override
  String get mediaFieldType => 'File type';

  @override
  String get mediaFieldSize => 'Size';

  @override
  String get mediaFieldUploadedBy => 'Uploaded by';

  @override
  String get mediaFieldUploaded => 'Uploaded';

  @override
  String get mediaFieldUpdated => 'Last updated';

  @override
  String get mediaFieldVersion => 'Version';

  @override
  String mediaVersion(int version) {
    return 'v$version';
  }

  @override
  String get mediaNoClient => 'No client';

  @override
  String get mediaYou => 'You';

  @override
  String get mediaOpen => 'Open';

  @override
  String get mediaDownload => 'Download';

  @override
  String get mediaOpenFailed => 'Couldn’t open the file';

  @override
  String get mediaZoomHint => 'Pinch or scroll to zoom';

  @override
  String mediaPreviewSemantics(String name) {
    return 'Preview of $name';
  }

  @override
  String mediaNotReadyBody(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING_UPLOAD':
          'This file is still uploading. It can be opened once the upload finishes.',
      'FAILED': 'This upload failed. Delete it and upload the file again.',
      'other': 'This file isn’t available yet.',
    });
    return '$_temp0';
  }

  @override
  String get mediaPickerTitle => 'Choose media';

  @override
  String get mediaPickerEmpty => 'No ready files for this client';

  @override
  String get mediaPickerEmptyBody =>
      'Upload images or videos to use them in this post.';

  @override
  String mediaPickerSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count selected',
      one: '1 selected',
      zero: 'Nothing selected',
    );
    return '$_temp0';
  }

  @override
  String mediaPickerSelectedOf(int count, int max) {
    return '$count of $max selected';
  }

  @override
  String mediaPickerConfirm(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Add $count',
      zero: 'Add',
    );
    return '$_temp0';
  }

  @override
  String get mediaStatAll => 'Files';

  @override
  String get mediaStatImages => 'Images';

  @override
  String get mediaStatVideos => 'Videos';

  @override
  String get mediaStatDocs => 'Documents';

  @override
  String get navMessages => 'Messages';

  @override
  String get messagesSearchHint => 'Search conversations';

  @override
  String get messagesEmpty => 'No conversations yet';

  @override
  String get messagesEmptyBody =>
      'Start a conversation with a client, or wait for them to message you.';

  @override
  String get messagesEmptyPortalBody =>
      'Message your agency when you have a question or feedback.';

  @override
  String get messagesSelectTitle => 'Select a conversation';

  @override
  String get messagesSelectBody =>
      'Pick a thread from the list to read and reply.';

  @override
  String messagesThreadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count threads',
      one: '1 thread',
      zero: 'No threads',
    );
    return '$_temp0';
  }

  @override
  String get messagesNew => 'New conversation';

  @override
  String get messagesNewPortal => 'Message agency';

  @override
  String get messagesNewTitle => 'New conversation';

  @override
  String get messagesNewPortalTitle => 'Message your agency';

  @override
  String get messagesClientFilter => 'Client';

  @override
  String get messagesClientLabel => 'Client';

  @override
  String get messagesFirstMessageLabel => 'Message';

  @override
  String get messagesSend => 'Send';

  @override
  String get messagesComposerHint => 'Write a message…';

  @override
  String get messagesResolve => 'Resolve';

  @override
  String get messagesReopen => 'Reopen';

  @override
  String get messagesReopenHint =>
      'This conversation is resolved. Sending a message will reopen it.';

  @override
  String get messagesResolvedToast => 'Conversation resolved';

  @override
  String get messagesReopenedToast => 'Conversation reopened';

  @override
  String get messagesOpenPost => 'Open post';

  @override
  String get messagesReadOnly =>
      'You can read this conversation but not reply.';

  @override
  String get messagesNoMessages => 'No messages yet';

  @override
  String get messagesNoMessagesBody =>
      'Send the first message to start the conversation.';

  @override
  String get messagesPreviewUnavailable => 'Preview unavailable';

  @override
  String messagesPreview(String author, String body) {
    return '$author: $body';
  }

  @override
  String messagesMessageLabel(String author, String when, String body) {
    return '$author, $when: $body';
  }

  @override
  String get messagesSending => 'Sending…';

  @override
  String get messagesToday => 'Today';

  @override
  String get messagesYesterday => 'Yesterday';

  @override
  String get messagesYou => 'You';

  @override
  String get messagesAgency => 'Agency';

  @override
  String get messagesAgencyConversation => 'Your agency';

  @override
  String get messagesClientConversation => 'Client';

  @override
  String get messagesContentConversation => 'Content feedback';

  @override
  String messagesStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'OPEN': 'Open',
      'RESOLVED': 'Resolved',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get portalWelcome => 'Client portal';

  @override
  String portalSubtitle(String name) {
    return 'Welcome back, $name. Here is what needs your attention.';
  }

  @override
  String get portalSubtitleFallback =>
      'Here is what needs your attention with your agency.';

  @override
  String get portalEmptyTitle => 'Nothing to show yet';

  @override
  String get portalEmptyBody =>
      'When your agency shares work, invoices or messages, they will appear here.';

  @override
  String get portalQuickActions => 'Quick actions';

  @override
  String get portalQuickReview => 'Review posts';

  @override
  String get portalQuickInvoices => 'Open invoices';

  @override
  String get portalQuickMessage => 'Message agency';

  @override
  String get portalQuickProjects => 'View projects';

  @override
  String get portalKpiAria => 'Portal summary';

  @override
  String get portalKpiRetry => 'Couldn\'t load · tap to retry';

  @override
  String get portalKpiApprovals => 'Awaiting your review';

  @override
  String portalKpiApprovalsCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count posts ready',
      one: '1 post ready',
      zero: 'Nothing waiting',
    );
    return '$_temp0';
  }

  @override
  String get portalKpiInvoices => 'Open invoices';

  @override
  String portalKpiInvoicesCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count need payment',
      one: '1 needs payment',
      zero: 'All clear',
    );
    return '$_temp0';
  }

  @override
  String get portalKpiMessages => 'Open conversations';

  @override
  String portalKpiMessagesCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count open threads',
      one: '1 open thread',
      zero: 'Inbox clear',
    );
    return '$_temp0';
  }

  @override
  String get portalKpiProjects => 'Active projects';

  @override
  String portalKpiProjectsCaption(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count in progress',
      one: '1 in progress',
      zero: 'None in flight',
    );
    return '$_temp0';
  }

  @override
  String get portalApprovalsTitle => 'Ready for your review';

  @override
  String get portalApprovalsEmpty =>
      'Nothing is waiting for your approval right now.';

  @override
  String get portalApprovalsCta => 'Review posts';

  @override
  String get portalInvoicesTitle => 'Invoices';

  @override
  String get portalInvoicesEmpty => 'No open invoices. You\'re all caught up.';

  @override
  String get portalInvoicesCta => 'View invoices';

  @override
  String get portalMessagesTitle => 'Messages';

  @override
  String get portalMessagesEmpty => 'No open conversations with your agency.';

  @override
  String get portalMessagesCta => 'Open messages';

  @override
  String get portalProjectsTitle => 'Projects';

  @override
  String get portalProjectsEmpty => 'No active projects yet.';

  @override
  String get portalProjectsCta => 'View projects';

  @override
  String get portalContentTitle => 'Recent content';

  @override
  String get portalContentEmpty =>
      'No published or scheduled posts to show yet.';

  @override
  String get portalContentCta => 'Browse content';

  @override
  String portalContentStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'IN_REVIEW': 'In review',
      'CHANGES_REQUESTED': 'Changes requested',
      'APPROVED': 'Approved',
      'SCHEDULED': 'Scheduled',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String portalInvoiceStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'OVERDUE': 'Overdue',
      'VOID': 'Void',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String portalProjectStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PLANNING': 'Planning',
      'ACTIVE': 'Active',
      'ON_HOLD': 'On hold',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get portalMessageOpen => 'Open';

  @override
  String get portalMessageResolved => 'Resolved';

  @override
  String portalDue(String when) {
    return 'Due $when';
  }

  @override
  String portalScheduled(String when) {
    return 'Scheduled $when';
  }

  @override
  String get navProjects => 'Projects';

  @override
  String get projectsTitle => 'Projects';

  @override
  String get projectsSearch => 'Search projects';

  @override
  String get projectsEmpty => 'No projects yet';

  @override
  String get projectsEmptyBody =>
      'Projects group a client\'s tasks, budget and timeline in one place.';

  @override
  String get projectNew => 'New project';

  @override
  String get projectEdit => 'Edit project';

  @override
  String projectStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PLANNING': 'Planning',
      'ACTIVE': 'Active',
      'ON_HOLD': 'On hold',
      'COMPLETED': 'Completed',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get projectStatusLabel => 'Status';

  @override
  String get projectStatusChange => 'Change status';

  @override
  String get projectName => 'Project name';

  @override
  String get projectNameHint => 'e.g. Diwali campaign';

  @override
  String get projectType => 'Type';

  @override
  String get projectTypeHint => 'e.g. Campaign, Retainer, Website';

  @override
  String get projectClient => 'Client';

  @override
  String get projectClientLocked => 'A project\'s client cannot be changed.';

  @override
  String get projectOwner => 'Owner';

  @override
  String get projectStartDate => 'Start date';

  @override
  String get projectEndDate => 'End date';

  @override
  String get projectEndBeforeStart =>
      'The end date cannot be before the start date.';

  @override
  String get projectBudget => 'Budget';

  @override
  String projectBudgetField(String currency) {
    return 'Budget ($currency)';
  }

  @override
  String get projectBudgetInvalid => 'Enter an amount, e.g. 50000';

  @override
  String get projectNoBudget => 'No budget';

  @override
  String get projectCreatedOn => 'Created';

  @override
  String get projectTimeline => 'Timeline';

  @override
  String get projectNoEnd => 'No end date';

  @override
  String projectDateRange(String start, String end) {
    return '$start – $end';
  }

  @override
  String projectProgress(int done, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total tasks',
      one: '1 task',
    );
    return '$done of $_temp0 done';
  }

  @override
  String get projectProgressLabel => 'Progress';

  @override
  String get projectNoTasks => 'No tasks yet';

  @override
  String get projectLogged => 'Time logged';

  @override
  String get projectTasks => 'Tasks';

  @override
  String get projectTasksEmpty => 'No tasks in this project yet.';

  @override
  String get projectAddTask => 'Add task';

  @override
  String get projectFacts => 'Key facts';

  @override
  String get projectContent => 'Client content';

  @override
  String get projectContentEmpty => 'No content for this client yet.';

  @override
  String projectContentStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'IN_REVIEW': 'In review',
      'CHANGES_REQUESTED': 'Changes requested',
      'APPROVED': 'Approved',
      'SCHEDULED': 'Scheduled',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get projectFilterClient => 'Client';

  @override
  String projectOpenClient(String name) {
    return 'Open client $name';
  }

  @override
  String projectOpenTask(String title) {
    return 'Open task $title';
  }

  @override
  String get projectNoClients =>
      'Add a client first — every project belongs to one.';

  @override
  String get projectStatAll => 'Projects';

  @override
  String get projectStatActive => 'Active';

  @override
  String get projectStatPlanning => 'Planning';

  @override
  String get projectStatDone => 'Completed';

  @override
  String get navReports => 'Reports';

  @override
  String get reportsTitle => 'Reports';

  @override
  String get reportsTab => 'Reports';

  @override
  String get reportAnalyticsTab => 'Analytics';

  @override
  String get reportNew => 'New report';

  @override
  String get reportEdit => 'Edit report';

  @override
  String get reportsSearch => 'Search by title or client';

  @override
  String get reportsEmpty => 'No reports yet';

  @override
  String get reportsEmptyBody =>
      'Create a report to share a period\'s results with a client.';

  @override
  String get reportsEmptyPortalBody =>
      'Reports your agency shares with you will appear here.';

  @override
  String get reportClient => 'Client';

  @override
  String get reportClientUnknown => 'Unknown client';

  @override
  String get reportStatusLabel => 'Status';

  @override
  String reportStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'READY': 'Ready',
      'SENT': 'Sent',
      'other': 'Unknown',
    });
    return '$_temp0';
  }

  @override
  String reportStatusHint(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT':
          'Still being prepared. Mark it ready once the figures are final.',
      'READY':
          'Final and ready to share. Send it, or move it back to draft to keep editing.',
      'SENT': 'Shared with the client.',
      'other': 'Status unknown.',
    });
    return '$_temp0';
  }

  @override
  String reportTransitionAction(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Back to draft',
      'READY': 'Mark ready',
      'SENT': 'Mark sent',
      'other': 'Update',
    });
    return '$_temp0';
  }

  @override
  String reportTransitionDone(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Moved back to draft',
      'READY': 'Marked ready',
      'SENT': 'Marked as sent',
      'other': 'Status updated',
    });
    return '$_temp0';
  }

  @override
  String reportSendConfirmTitle(String title) {
    return 'Mark “$title” as sent?';
  }

  @override
  String get reportSendConfirmBody =>
      'Sent reports can no longer change status.';

  @override
  String reportStepSemantics(int step, int total, String status) {
    return 'Step $step of $total: $status';
  }

  @override
  String get reportPeriod => 'Period';

  @override
  String reportPeriodRange(String start, String end) {
    return '$start – $end';
  }

  @override
  String get reportPeriodStart => 'Period start';

  @override
  String get reportPeriodEnd => 'Period end';

  @override
  String get reportCreated => 'Created';

  @override
  String get reportTitleLabel => 'Title';

  @override
  String get reportSummary => 'Summary';

  @override
  String get reportNoSummary => 'No summary yet';

  @override
  String reportCardSemantics(
    String title,
    String client,
    String status,
    String period,
  ) {
    return '$title, $client, $status, $period';
  }

  @override
  String get reportSnapshot => 'Contents';

  @override
  String get reportSnapshotEmpty => 'This report has no figures yet.';

  @override
  String get reportHighlights => 'Highlights';

  @override
  String get reportDetails => 'Details';

  @override
  String get reportYes => 'Yes';

  @override
  String get reportNo => 'No';

  @override
  String reportMetricName(String metric, String fallback) {
    String _temp0 = intl.Intl.selectLogic(metric, {
      'reach': 'Reach',
      'engagement': 'Engagement',
      'followers': 'Followers',
      'impressions': 'Impressions',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String reportRangeDays(int days) {
    return '${days}d';
  }

  @override
  String reportRangeTooltip(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Last $days days',
      one: 'Last day',
    );
    return '$_temp0';
  }

  @override
  String get reportAnalyticsEmpty => 'No analytics yet';

  @override
  String reportAnalyticsEmptyBody(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'No metrics were recorded in the last $days days.',
      one: 'No metrics were recorded in the last day.',
    );
    return '$_temp0 Connect social accounts to start collecting them.';
  }

  @override
  String reportChange(String percent, String direction, int days) {
    String _temp0 = intl.Intl.selectLogic(direction, {
      'up': '▲ $percent',
      'down': '▼ $percent',
      'other': '$percent',
    });
    return '$_temp0 vs previous $days days';
  }

  @override
  String get reportNoComparison => 'No earlier data to compare';

  @override
  String reportLatest(String value) {
    return 'Latest $value';
  }

  @override
  String reportTotal(String value) {
    return 'Total $value';
  }

  @override
  String reportChartSemantics(
    String metric,
    int days,
    String total,
    String peak,
  ) {
    return '$metric over the last $days days: total $total, daily peak $peak';
  }

  @override
  String get navRoles => 'Roles & permissions';

  @override
  String get rolesTitle => 'Roles & permissions';

  @override
  String get rolesSubtitle =>
      'Define what each role can see and do. Members can hold several roles; their access is the sum of them.';

  @override
  String get rolesSearch => 'Search roles';

  @override
  String get rolesEmpty => 'No roles yet';

  @override
  String get rolesEmptyBody =>
      'Create a custom role to give people exactly the access they need.';

  @override
  String get roleNew => 'New role';

  @override
  String get roleEdit => 'Edit role';

  @override
  String get roleCreate => 'Create role';

  @override
  String get roleDuplicate => 'Duplicate as custom role';

  @override
  String roleDuplicateName(String name) {
    return '$name (copy)';
  }

  @override
  String get roleDelete => 'Delete role';

  @override
  String roleKind(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'system': 'System',
      'custom': 'Custom',
      'other': '$kind',
    });
    return '$_temp0';
  }

  @override
  String roleMembers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count members',
      one: '1 member',
      zero: 'No members',
    );
    return '$_temp0';
  }

  @override
  String rolePermissionCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count permissions',
      one: '1 permission',
      zero: 'No permissions',
    );
    return '$_temp0';
  }

  @override
  String get roleNoDescription => 'No description';

  @override
  String get roleName => 'Role name';

  @override
  String get roleNameHint => 'e.g. Senior strategist';

  @override
  String get roleDescription => 'Description';

  @override
  String get roleDescriptionHint => 'What is this role for?';

  @override
  String get rolePermissions => 'Permissions';

  @override
  String get rolePermissionsSearch => 'Search permissions';

  @override
  String rolePermissionsSelected(int selected, int total) {
    return '$selected of $total permissions selected';
  }

  @override
  String roleGroupCount(int selected, int total) {
    return '$selected/$total';
  }

  @override
  String roleGroupToggle(String group) {
    return 'Grant every $group permission';
  }

  @override
  String get roleAssignedTo => 'Assigned to';

  @override
  String get roleExpandAll => 'Expand all';

  @override
  String get roleCollapseAll => 'Collapse all';

  @override
  String get rolePermissionsNoMatch => 'No permissions match your search.';

  @override
  String get rolePermissionsRequired => 'Select at least one permission.';

  @override
  String rolePermissionsMore(int count) {
    return '+$count more';
  }

  @override
  String get roleSystemReadOnly =>
      'System roles are read-only. Duplicate this role to grant a different set of permissions.';

  @override
  String get roleUnsavedTitle => 'Discard changes?';

  @override
  String get roleUnsavedBody => 'Your edits to this role have not been saved.';

  @override
  String get roleDiscard => 'Discard';

  @override
  String roleInUse(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count members still hold this role. Reassign them before deleting it.',
      one: '1 member still holds this role. Reassign them before deleting it.',
    );
    return '$_temp0';
  }

  @override
  String get roleStatRoles => 'Roles';

  @override
  String get roleStatCustom => 'Custom roles';

  @override
  String get roleStatPermissions => 'Permissions available';

  @override
  String rolePermissionGroup(String group, String fallback) {
    String _temp0 = intl.Intl.selectLogic(group, {
      'k_org': 'Organization',
      'k_members': 'Members',
      'k_roles': 'Roles',
      'k_workspaces': 'Workspaces',
      'k_clients': 'Clients',
      'k_leads': 'Leads',
      'k_projects': 'Projects',
      'k_tasks': 'Tasks',
      'k_content': 'Content',
      'k_social': 'Social publishing',
      'k_approvals': 'Approvals',
      'k_feedback': 'Feedback',
      'k_files': 'Files',
      'k_inbox': 'Inbox',
      'k_workflows': 'Workflows',
      'k_automations': 'Automations',
      'k_reports': 'Reports',
      'k_invoices': 'Invoices',
      'k_time': 'Time tracking',
      'k_audit': 'Audit log',
      'k_integrations': 'Integrations',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String rolePermissionAction(String action, String fallback) {
    String _temp0 = intl.Intl.selectLogic(action, {
      'k_view': 'View',
      'k_create': 'Create',
      'k_edit': 'Edit',
      'k_delete': 'Delete',
      'k_invite': 'Invite',
      'k_deactivate': 'Deactivate',
      'k_manage': 'Manage',
      'k_settings_manage': 'Manage settings',
      'k_billing_manage': 'Manage billing',
      'k_branding_manage': 'Manage branding',
      'k_convert': 'Convert',
      'k_assign': 'Assign',
      'k_transition': 'Change status',
      'k_schedule': 'Schedule',
      'k_publish': 'Publish',
      'k_approve': 'Approve',
      'k_resolve': 'Resolve',
      'k_upload': 'Upload',
      'k_reply': 'Reply',
      'k_track': 'Track',
      'other': '$fallback',
    });
    return '$_temp0';
  }

  @override
  String rolePermissionLabel(String group, String action) {
    return '$group · $action';
  }

  @override
  String get navSearch => 'Search';

  @override
  String get searchTitle => 'Search';

  @override
  String get searchPlaceholder => 'Search clients, projects, tasks…';

  @override
  String searchMinChars(int count) {
    return 'Type at least $count characters to search';
  }

  @override
  String get searchEmpty => 'No results';

  @override
  String searchEmptyBody(String query) {
    return 'Nothing matched “$query”. Try a different name or keyword.';
  }

  @override
  String get searchIdleTitle => 'Search the workspace';

  @override
  String get searchIdleBody =>
      'Find clients, projects, tasks, leads and content in one place.';

  @override
  String searchResultsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count results',
      one: '1 result',
    );
    return '$_temp0';
  }

  @override
  String searchGroupCount(int count) {
    return '$count';
  }

  @override
  String get searchGroupClients => 'Clients';

  @override
  String get searchGroupProjects => 'Projects';

  @override
  String get searchGroupTasks => 'Tasks';

  @override
  String get searchGroupLeads => 'Leads';

  @override
  String get searchGroupContent => 'Content';

  @override
  String get searchGroupInvoices => 'Invoices';

  @override
  String get searchGroupApprovals => 'Approvals';

  @override
  String searchResultAria(String type, String title) {
    return '$type: $title';
  }

  @override
  String searchStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'ONBOARDING': 'Onboarding',
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'CHURNED': 'Churned',
      'PLANNING': 'Planning',
      'ON_HOLD': 'On hold',
      'COMPLETED': 'Completed',
      'TODO': 'To do',
      'IN_PROGRESS': 'In progress',
      'IN_REVIEW': 'In review',
      'DONE': 'Done',
      'DRAFT': 'Draft',
      'CHANGES_REQUESTED': 'Changes requested',
      'APPROVED': 'Approved',
      'SCHEDULED': 'Scheduled',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get navTasks => 'To-do';

  @override
  String get tasksTitle => 'To-do';

  @override
  String get tasksSearch => 'Search tasks';

  @override
  String get tasksEmpty => 'No tasks yet';

  @override
  String get tasksEmptyBody =>
      'Create a task to plan, assign and track work for your clients.';

  @override
  String get taskNew => 'New task';

  @override
  String get taskEdit => 'Edit task';

  @override
  String get taskDelete => 'Delete task';

  @override
  String get taskViewBoard => 'Board';

  @override
  String get taskViewList => 'List';

  @override
  String taskScope(String scope) {
    String _temp0 = intl.Intl.selectLogic(scope, {
      'mine': 'Mine',
      'unassigned': 'Unassigned',
      'overdue': 'Overdue',
      'other': '$scope',
    });
    return '$_temp0';
  }

  @override
  String taskStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'TODO': 'To do',
      'IN_PROGRESS': 'In progress',
      'IN_REVIEW': 'In review',
      'DONE': 'Done',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String taskPriority(String priority) {
    String _temp0 = intl.Intl.selectLogic(priority, {
      'LOW': 'Low',
      'MEDIUM': 'Medium',
      'HIGH': 'High',
      'URGENT': 'Urgent',
      'other': '$priority',
    });
    return '$_temp0';
  }

  @override
  String get taskFilterPriority => 'Priority';

  @override
  String get taskFilterProject => 'Project';

  @override
  String get taskFilterClient => 'Client';

  @override
  String get taskFilterStatus => 'Status';

  @override
  String get taskFiltersClear => 'Clear filters';

  @override
  String taskColumnCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tasks',
      one: '1 task',
      zero: 'No tasks',
    );
    return '$_temp0';
  }

  @override
  String taskColumnSemantics(String status, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tasks',
      one: '1 task',
      zero: 'no tasks',
    );
    return '$status: $_temp0';
  }

  @override
  String get taskColumnEmpty => 'Nothing here yet';

  @override
  String get taskColumnDrop => 'Drop to move here';

  @override
  String get taskDragHint =>
      'Long-press a card and drag it to another column to change its status.';

  @override
  String taskMovedToast(String status) {
    return 'Moved to $status';
  }

  @override
  String get taskStatusChange => 'Change status';

  @override
  String get taskStatusLabel => 'Status';

  @override
  String get taskPriorityLabel => 'Priority';

  @override
  String get taskPriorityChange => 'Change priority';

  @override
  String get taskTitleLabel => 'Title';

  @override
  String get taskTitleHint => 'What needs to be done?';

  @override
  String get taskDescription => 'Description';

  @override
  String get taskDescriptionEmpty => 'No description yet.';

  @override
  String get taskProject => 'Project';

  @override
  String taskProjectWithClient(String client, String project) {
    return '$client · $project';
  }

  @override
  String get taskClient => 'Client';

  @override
  String get taskAssignee => 'Assignee';

  @override
  String get taskAssigneeChange => 'Change assignee';

  @override
  String taskAssignedTo(String name) {
    return 'Assigned to $name';
  }

  @override
  String get taskDueDate => 'Due date';

  @override
  String get taskEstimate => 'Estimate';

  @override
  String get taskEstimateHours => 'Estimate (hours)';

  @override
  String get taskEstimateHint => 'e.g. 1.5';

  @override
  String get taskEstimateInvalid => 'Enter a number of hours, e.g. 1.5';

  @override
  String get taskCreatedOn => 'Created';

  @override
  String taskOpenProject(String name) {
    return 'Open project $name';
  }

  @override
  String taskOpenClient(String name) {
    return 'Open client $name';
  }

  @override
  String get taskNoProjects =>
      'Create a project first — every task belongs to one.';

  @override
  String get navTeam => 'Team';

  @override
  String get teamTabMembers => 'Members';

  @override
  String get teamTabInvitations => 'Invitations';

  @override
  String get teamSearch => 'Search people, emails or roles';

  @override
  String get teamFilterByRole => 'Filter by role';

  @override
  String get teamEmpty => 'No one here yet';

  @override
  String get teamEmptyBody =>
      'Invite teammates and clients to start working together.';

  @override
  String get teamYou => 'You';

  @override
  String get teamEmail => 'Email';

  @override
  String get teamEmailHint => 'name@agency.com';

  @override
  String get teamEmailCopied => 'Email copied';

  @override
  String get teamJoined => 'Joined';

  @override
  String get teamType => 'Access level';

  @override
  String teamMembershipType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'OWNER': 'Owner',
      'ADMIN': 'Admin',
      'MEMBER': 'Member',
      'CLIENT': 'Client',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String teamMembershipTypeHint(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'OWNER': 'Owns the workspace, including billing and every permission.',
      'ADMIN':
          'Default admin permissions for clients, projects and the team. Assign custom roles for finer control.',
      'MEMBER':
          'Default member permissions for tasks and content. Assign custom roles for finer control.',
      'CLIENT':
          'Client — sees only their own content, approvals, files and invoices in the portal.',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String teamMemberStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'ACTIVE': 'Active',
      'INVITED': 'Invited',
      'DEACTIVATED': 'Deactivated',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get teamRoles => 'Roles';

  @override
  String get teamRolesNone => 'No roles assigned.';

  @override
  String teamRolesEdit(String name) {
    return 'Roles for $name';
  }

  @override
  String get teamRolesRequired => 'Pick at least one role.';

  @override
  String teamRolesMax(int max) {
    return 'Pick up to $max roles.';
  }

  @override
  String teamRolesCount(int selected, int max) {
    return '$selected of $max';
  }

  @override
  String get teamRolesHint =>
      'Access is the sum of every role selected. Build custom roles in Roles & permissions.';

  @override
  String get teamRolesHintNoCustom =>
      'Only system roles exist so far. Create custom roles in Roles & permissions for finer control.';

  @override
  String get teamTypeChange => 'Change access level';

  @override
  String get teamTypeChangeNotice =>
      'Switching access level replaces their system role with the default role for the new level. Custom roles stay assigned.';

  @override
  String teamProtected(String reason) {
    String _temp0 = intl.Intl.selectLogic(reason, {
      'self': 'You cannot change your own membership. Ask another admin.',
      'owner': 'The owner\'s membership cannot be changed here.',
      'client':
          'Client portal access is managed from the client\'s invitations.',
      'other': 'This membership cannot be changed here.',
    });
    return '$_temp0';
  }

  @override
  String get teamDeactivate => 'Deactivate';

  @override
  String teamDeactivateTitle(String name) {
    return 'Deactivate $name?';
  }

  @override
  String get teamDeactivateBody =>
      'They lose access to this workspace immediately and every role they hold is removed. You can invite them again later.';

  @override
  String teamDeactivated(String name) {
    return '$name was deactivated';
  }

  @override
  String get teamInvite => 'Invite';

  @override
  String get teamInviteSend => 'Send invite';

  @override
  String get teamInviteBody =>
      'They get an email with a link to join. You can change their access any time.';

  @override
  String get teamClient => 'Client';

  @override
  String get teamClientRequired => 'Choose the client this person belongs to.';

  @override
  String get teamClientNone =>
      'No clients are available to you. Portal invitations need a client you can view.';

  @override
  String get teamClientUnavailable =>
      'Clients could not be loaded. Try again in a moment.';

  @override
  String get teamInviteDefaultRole =>
      'Leave roles empty to give the default role for the access level.';

  @override
  String get teamInviteExpiry => 'Link expires after';

  @override
  String teamInviteExpiryDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days',
      one: '1 day',
    );
    return '$_temp0';
  }

  @override
  String get teamInviteSent => 'Invitation sent';

  @override
  String teamInviteSentBody(String email) {
    return 'We emailed $email a link to join. You can also share it yourself.';
  }

  @override
  String teamInviteExpires(String date) {
    return 'Link expires $date';
  }

  @override
  String get teamCopyLink => 'Copy link';

  @override
  String get teamLinkCopied => 'Invite link copied';

  @override
  String get teamCopyMessage => 'Copy invitation message';

  @override
  String get teamMessageCopied => 'Invitation message copied';

  @override
  String teamInviteShareText(String url) {
    return 'You\'re invited to join our workspace on WhizSuite. Accept here: $url';
  }

  @override
  String get teamInvitationsSearch => 'Search invitations';

  @override
  String get teamInvitationsEmpty => 'No invitations';

  @override
  String get teamInvitationsEmptyBody =>
      'Invitations you send appear here until they are accepted.';

  @override
  String teamInvitationStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'PENDING': 'Pending',
      'ACCEPTED': 'Accepted',
      'REVOKED': 'Revoked',
      'EXPIRED': 'Expired',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String teamInviteAccepted(String when) {
    return 'Accepted $when';
  }

  @override
  String teamInviteExpiresIn(String when) {
    return 'Expires $when';
  }

  @override
  String teamInviteExpiredAgo(String when) {
    return 'Expired $when';
  }

  @override
  String get teamRevoke => 'Revoke invite';

  @override
  String teamRevokeTitle(String email) {
    return 'Revoke the invite for $email?';
  }

  @override
  String get teamRevokeBody =>
      'The link stops working straight away. You can send a new invite later.';

  @override
  String get teamRevoked => 'Invitation revoked';

  @override
  String get teamStatMembers => 'People';

  @override
  String get teamStatStaff => 'Staff';

  @override
  String get teamStatClients => 'Clients';

  @override
  String get navTemplates => 'Templates';

  @override
  String get templatesTitle => 'Templates';

  @override
  String get templatesSearch => 'Search templates';

  @override
  String get templatesEmpty => 'No templates yet';

  @override
  String get templatesEmptyBody =>
      'Save your best projects, checklists and messages as templates so every new one starts right.';

  @override
  String get templateNew => 'New template';

  @override
  String get templateEdit => 'Edit template';

  @override
  String get templateName => 'Name';

  @override
  String get templateNameHint => 'e.g. Monthly social retainer kickoff';

  @override
  String templateType(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'PROJECT': 'Project',
      'TASK': 'Task',
      'CONTENT': 'Content',
      'REPORT': 'Report',
      'MESSAGE': 'Message',
      'other': '$type',
    });
    return '$_temp0';
  }

  @override
  String templateScope(String scope) {
    String _temp0 = intl.Intl.selectLogic(scope, {
      'ORGANIZATION': 'Whole agency',
      'CLIENT': 'One client',
      'other': '$scope',
    });
    return '$_temp0';
  }

  @override
  String templateItems(String type) {
    String _temp0 = intl.Intl.selectLogic(type, {
      'PROJECT': 'Tasks',
      'TASK': 'Checklist',
      'CONTENT': 'Sections',
      'REPORT': 'Sections',
      'MESSAGE': 'Talking points',
      'other': 'Items',
    });
    return '$_temp0';
  }

  @override
  String get templateTypeField => 'Type';

  @override
  String get templateScopeField => 'Available to';

  @override
  String get templateClientField => 'Client';

  @override
  String get templateDescriptionField => 'Description';

  @override
  String get templateBodyField => 'Body';

  @override
  String get templateBodyHint =>
      'Default text new items start with, such as a brief or message.';

  @override
  String get templateVersionField => 'Version';

  @override
  String get templateCreated => 'Created';

  @override
  String get templateNoDescription => 'No description';

  @override
  String get templateNoItems => 'Nothing added yet.';

  @override
  String get templateOtherFields => 'Other fields';

  @override
  String templateItemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$_temp0';
  }

  @override
  String templateVersion(int version) {
    return 'v$version';
  }

  @override
  String get templateStatAll => 'Templates';

  @override
  String get templateStatOrg => 'Agency-wide';

  @override
  String get templateStatClient => 'Client-scoped';

  @override
  String templateCreatedOn(String when) {
    return 'Created $when';
  }

  @override
  String get navTime => 'Time';

  @override
  String get timeTitle => 'Time';

  @override
  String get timeLog => 'Log time';

  @override
  String get timeLogged => 'Time logged';

  @override
  String get timeDeleteTitle => 'Delete this time entry?';

  @override
  String get timeScopeMine => 'My time';

  @override
  String get timeScopeTeam => 'Team';

  @override
  String get timeEntries => 'Entries';

  @override
  String timeEntryCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count entries',
      one: '1 entry',
      zero: 'No entries',
    );
    return '$_temp0';
  }

  @override
  String get timeEntriesEmpty => 'No time tracked this week';

  @override
  String get timeEntriesEmptyBody =>
      'Start the timer on a task or log time you have already spent.';

  @override
  String get timeToday => 'Today';

  @override
  String get timeYesterday => 'Yesterday';

  @override
  String timeDaySemantics(String day, String dayDate, String total) {
    return '$day, $dayDate: $total tracked';
  }

  @override
  String get timeTimerTitle => 'Timer';

  @override
  String get timeTimerIdle => 'Pick a task and start tracking.';

  @override
  String get timeTimerLoadFailed => 'Could not load your timer.';

  @override
  String get timeTimerRunningUnknown => 'Tracking a task';

  @override
  String timeTimerStartedAt(String startedAt) {
    return 'Started at $startedAt';
  }

  @override
  String timeTimerElapsedSemantics(String duration) {
    return 'Timer running, $duration elapsed';
  }

  @override
  String get timeTimerStart => 'Start timer';

  @override
  String get timeTimerStop => 'Stop and save';

  @override
  String get timeTimerStarted => 'Timer started';

  @override
  String get timeTimerSaved => 'Time saved';

  @override
  String get timeTimerNoAssignedTasks =>
      'No open tasks are assigned to you. Pick a project to see all of its tasks.';

  @override
  String get timeTimerNoProjectTasks => 'This project has no open tasks.';

  @override
  String get timeProject => 'Project';

  @override
  String timeProjectOfClient(String project, String client) {
    return '$project · $client';
  }

  @override
  String get timeNoProject => 'No project';

  @override
  String get timeTask => 'Task';

  @override
  String get timeTaskOptional => 'Task (optional)';

  @override
  String get timeDate => 'Date';

  @override
  String get timeHours => 'Hours';

  @override
  String get timeHoursSuffix => 'h';

  @override
  String get timeMinutes => 'Minutes';

  @override
  String get timeMinutesSuffix => 'm';

  @override
  String timeDurationRange(int max) {
    return 'Enter between 1 minute and $max hours';
  }

  @override
  String timeMinutesRange(int max) {
    return 'Use 0 to $max minutes';
  }

  @override
  String get timeNote => 'Note';

  @override
  String get timeBillable => 'Billable';

  @override
  String get timeNonBillable => 'Non-billable';

  @override
  String get timeBillableHint => 'Counts towards client billing';

  @override
  String timeEntrySemantics(String title, String duration, String billable) {
    return '$title, $duration, $billable';
  }

  @override
  String timeWeekRange(String start, String end) {
    return '$start – $end';
  }

  @override
  String get timeWeekPrevious => 'Previous week';

  @override
  String get timeWeekNext => 'Next week';

  @override
  String get timeWeekCurrent => 'Back to this week';

  @override
  String get timeWeekTotal => 'Week total';

  @override
  String timeWeekChartSemantics(String days) {
    return 'Hours per day: $days';
  }

  @override
  String get navWorkflows => 'Workflows';

  @override
  String get workflowsTitle => 'Approval workflows';

  @override
  String get workflowsSearch => 'Search workflows or stages';

  @override
  String get workflowsEmpty => 'No workflows yet';

  @override
  String get workflowsEmptyBody =>
      'Create a workflow to standardise how content gets approved, from draft to published.';

  @override
  String get workflowNew => 'New workflow';

  @override
  String get workflowEdit => 'Edit workflow';

  @override
  String get workflowName => 'Name';

  @override
  String get workflowNameHint => 'e.g. Standard content approval';

  @override
  String get workflowActive => 'Active';

  @override
  String get workflowInactive => 'Inactive';

  @override
  String get workflowClientApproval => 'Client approval';

  @override
  String get workflowInternalOnly => 'Internal only';

  @override
  String workflowToggle(String name) {
    return 'Turn $name on or off';
  }

  @override
  String get workflowActivatedToast => 'Workflow activated';

  @override
  String get workflowDeactivatedToast => 'Workflow deactivated';

  @override
  String workflowStageCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stages',
      one: '1 stage',
    );
    return '$_temp0';
  }

  @override
  String workflowStagesSemantics(int count, String stages) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stages: $stages',
      one: '1 stage: $stages',
    );
    return '$_temp0';
  }

  @override
  String workflowSla(int hours) {
    return 'Respond within ${hours}h';
  }

  @override
  String get workflowNoSla => 'No response time set';

  @override
  String get workflowStagesTitle => 'Stages';

  @override
  String get workflowStagesField => 'Stages';

  @override
  String get workflowStagesHint =>
      'Content moves through the stages in this order. The first is where it starts, the last means done.';

  @override
  String workflowStagesCount(int count, int max) {
    return '$count of $max';
  }

  @override
  String workflowStageLabel(int number) {
    return 'Stage $number';
  }

  @override
  String get workflowStageAdd => 'Add stage';

  @override
  String get workflowStageMoveUp => 'Move up';

  @override
  String get workflowStageMoveDown => 'Move down';

  @override
  String workflowStageRemove(int number) {
    return 'Remove stage $number';
  }

  @override
  String workflowStagesTooFew(int min) {
    return 'Add at least $min stages';
  }

  @override
  String workflowStagesTooMany(int max) {
    return 'Use at most $max stages';
  }

  @override
  String get workflowStagesBlank => 'Every stage needs a name';

  @override
  String workflowStagesTooLong(int max) {
    return 'Keep stage names under $max characters';
  }

  @override
  String get workflowStagesVersionNote =>
      'Changing the stages publishes a new version. Content already in progress keeps its version.';

  @override
  String get workflowSlaField => 'Response time';

  @override
  String get workflowSlaHint =>
      'How long each approval may take. Leave empty for no limit.';

  @override
  String get workflowSlaSuffix => 'hours';

  @override
  String get workflowSlaInvalid => 'Enter whole hours';

  @override
  String workflowSlaRange(int max) {
    return 'Use between 1 and $max hours';
  }

  @override
  String get workflowClientApprovalField => 'Needs client approval';

  @override
  String get workflowClientApprovalHint =>
      'The client must approve before publishing.';

  @override
  String get workflowActiveField => 'Active';

  @override
  String get workflowActiveHint =>
      'Inactive workflows are not offered for new content.';

  @override
  String get workflowApprovalMetric => 'Sign-off';

  @override
  String get workflowVersionsTitle => 'Version';

  @override
  String get workflowNoVersion => 'This workflow has no published version yet.';

  @override
  String workflowVersionLabel(int version) {
    return 'v$version';
  }

  @override
  String get workflowVersionCurrent => 'Current version';

  @override
  String get workflowVersionUnpublished => 'Not published yet';

  @override
  String workflowVersionPublishedOn(String date) {
    return 'Published $date';
  }

  @override
  String workflowVersionStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'DRAFT': 'Draft',
      'PUBLISHED': 'Published',
      'other': '$status',
    });
    return '$_temp0';
  }

  @override
  String get workflowVersionPublish => 'Publish version';

  @override
  String get workflowVersionPublishedToast => 'Version published';

  @override
  String get workflowTransitionsTitle => 'Allowed moves';

  @override
  String get workflowTransitionsEmpty =>
      'No moves are defined in this version.';

  @override
  String get workflowCheckerTitle => 'Check a move';

  @override
  String get workflowCheckerBody =>
      'Pick two stages to see whether content can move directly between them.';

  @override
  String get workflowCheckerFrom => 'From stage';

  @override
  String get workflowCheckerTo => 'To stage';

  @override
  String get workflowCheckerCheck => 'Check';

  @override
  String get workflowCheckerAllowed => 'Allowed';

  @override
  String get workflowCheckerBlocked => 'Not allowed';

  @override
  String get workflowEntityType => 'Applies to';

  @override
  String workflowEntity(String entity) {
    String _temp0 = intl.Intl.selectLogic(entity, {
      'content': 'Content',
      'task': 'Tasks',
      'project': 'Projects',
      'other': '$entity',
    });
    return '$_temp0';
  }

  @override
  String get workflowCreated => 'Created';

  @override
  String get workflowUpdated => 'Last changed';

  @override
  String workflowKpiActiveOf(int active, int total) {
    return '$active of $total';
  }
}
