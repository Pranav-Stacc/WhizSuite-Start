// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Agency OS';

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
  String get authNoAccount => 'New to Agency OS?';

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
  String get authHeroEyebrow => 'Agency OS';

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
  String get settingsSignOutConfirm => 'Sign out of Agency OS on this device?';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

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
}
