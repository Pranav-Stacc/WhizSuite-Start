import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'WhizSuite'**
  String get appTitle;

  /// No description provided for @authLoginTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get authLoginTitle;

  /// No description provided for @authLoginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to run your agency from one place.'**
  String get authLoginSubtitle;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Work email'**
  String get authEmail;

  /// No description provided for @authEmailPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'you@agency.com'**
  String get authEmailPlaceholder;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authLoginSubmit.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authLoginSubmit;

  /// No description provided for @authOrEmail.
  ///
  /// In en, this message translates to:
  /// **'or use email'**
  String get authOrEmail;

  /// No description provided for @authGoogleButton.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authGoogleButton;

  /// No description provided for @authGoogleCancelled.
  ///
  /// In en, this message translates to:
  /// **'Google sign-in was cancelled.'**
  String get authGoogleCancelled;

  /// No description provided for @authGoogleNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No account for that Google email. Create a workspace first.'**
  String get authGoogleNoAccount;

  /// No description provided for @authGoogleInvalid.
  ///
  /// In en, this message translates to:
  /// **'Google sign-in was rejected. Try again.'**
  String get authGoogleInvalid;

  /// No description provided for @authGoogleWorkspaceRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter an agency name and workspace URL before continuing with Google.'**
  String get authGoogleWorkspaceRequired;

  /// No description provided for @authLoginInvalid.
  ///
  /// In en, this message translates to:
  /// **'Incorrect email or password.'**
  String get authLoginInvalid;

  /// No description provided for @authLoginExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session expired. Please sign in again.'**
  String get authLoginExpired;

  /// No description provided for @authNoAccount.
  ///
  /// In en, this message translates to:
  /// **'New to WhizSuite?'**
  String get authNoAccount;

  /// No description provided for @authCreateWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Create a workspace'**
  String get authCreateWorkspace;

  /// No description provided for @authRegisterTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your agency workspace'**
  String get authRegisterTitle;

  /// No description provided for @authRegisterSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Set up in under two minutes. No credit card.'**
  String get authRegisterSubtitle;

  /// No description provided for @authFirstName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get authFirstName;

  /// No description provided for @authLastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get authLastName;

  /// No description provided for @authOrganization.
  ///
  /// In en, this message translates to:
  /// **'Agency name'**
  String get authOrganization;

  /// No description provided for @authSlug.
  ///
  /// In en, this message translates to:
  /// **'Workspace URL'**
  String get authSlug;

  /// No description provided for @authSlugHint.
  ///
  /// In en, this message translates to:
  /// **'Lowercase letters, numbers and hyphens'**
  String get authSlugHint;

  /// No description provided for @authRegisterPassword.
  ///
  /// In en, this message translates to:
  /// **'Password ({min}+ characters)'**
  String authRegisterPassword(int min);

  /// No description provided for @authRegisterSubmit.
  ///
  /// In en, this message translates to:
  /// **'Create workspace'**
  String get authRegisterSubmit;

  /// No description provided for @authRegisterExists.
  ///
  /// In en, this message translates to:
  /// **'That workspace URL or email is already taken.'**
  String get authRegisterExists;

  /// No description provided for @authHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have a workspace?'**
  String get authHaveAccount;

  /// No description provided for @authSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignIn;

  /// No description provided for @authShowPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get authShowPassword;

  /// No description provided for @authHidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get authHidePassword;

  /// No description provided for @authHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'WhizSuite'**
  String get authHeroEyebrow;

  /// No description provided for @authHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Every client, post and invoice in one calm cockpit.'**
  String get authHeroTitle;

  /// No description provided for @authSignedOut.
  ///
  /// In en, this message translates to:
  /// **'You have been signed out.'**
  String get authSignedOut;

  /// No description provided for @authInviteTitle.
  ///
  /// In en, this message translates to:
  /// **'Join {organization}'**
  String authInviteTitle(String organization);

  /// No description provided for @authInviteSubtitle.
  ///
  /// In en, this message translates to:
  /// **'You were invited as {email}.'**
  String authInviteSubtitle(String email);

  /// No description provided for @authInviteSubtitleExisting.
  ///
  /// In en, this message translates to:
  /// **'Accept as {email}.'**
  String authInviteSubtitleExisting(String email);

  /// No description provided for @authInvitePassword.
  ///
  /// In en, this message translates to:
  /// **'Your password'**
  String get authInvitePassword;

  /// No description provided for @authInviteSetPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Choose a password (12+ characters) to join.'**
  String get authInviteSetPasswordHint;

  /// No description provided for @authInviteSubmit.
  ///
  /// In en, this message translates to:
  /// **'Accept invitation'**
  String get authInviteSubmit;

  /// No description provided for @authInviteInvalid.
  ///
  /// In en, this message translates to:
  /// **'This invitation link is invalid, already used or expired. Ask the sender for a new one.'**
  String get authInviteInvalid;

  /// No description provided for @authInviteInvalidTitle.
  ///
  /// In en, this message translates to:
  /// **'Invitation unavailable'**
  String get authInviteInvalidTitle;

  /// No description provided for @authInviteWrongPassword.
  ///
  /// In en, this message translates to:
  /// **'That password does not match the existing account for this email.'**
  String get authInviteWrongPassword;

  /// No description provided for @authInviteAlreadyMember.
  ///
  /// In en, this message translates to:
  /// **'This account is already a member of the workspace. Sign in instead.'**
  String get authInviteAlreadyMember;

  /// No description provided for @validationRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get validationRequired;

  /// No description provided for @validationEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address'**
  String get validationEmail;

  /// No description provided for @validationMinLength.
  ///
  /// In en, this message translates to:
  /// **'Use at least {min} characters'**
  String validationMinLength(int min);

  /// No description provided for @validationSlug.
  ///
  /// In en, this message translates to:
  /// **'Use lowercase letters, numbers and hyphens'**
  String get validationSlug;

  /// No description provided for @errorOffline.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Check your connection and try again.'**
  String get errorOffline;

  /// No description provided for @errorTimeout.
  ///
  /// In en, this message translates to:
  /// **'The server took too long to respond.'**
  String get errorTimeout;

  /// No description provided for @errorUnauthorized.
  ///
  /// In en, this message translates to:
  /// **'Your session expired. Please sign in again.'**
  String get errorUnauthorized;

  /// No description provided for @errorForbidden.
  ///
  /// In en, this message translates to:
  /// **'You do not have permission to do that.'**
  String get errorForbidden;

  /// No description provided for @errorNotFound.
  ///
  /// In en, this message translates to:
  /// **'We could not find that.'**
  String get errorNotFound;

  /// No description provided for @errorConflict.
  ///
  /// In en, this message translates to:
  /// **'This was changed by someone else. Refresh and try again.'**
  String get errorConflict;

  /// No description provided for @errorValidation.
  ///
  /// In en, this message translates to:
  /// **'Some details are not valid.'**
  String get errorValidation;

  /// No description provided for @errorRateLimited.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Wait a moment and try again.'**
  String get errorRateLimited;

  /// No description provided for @errorServer.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong on our side.'**
  String get errorServer;

  /// No description provided for @errorUnknown.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong.'**
  String get errorUnknown;

  /// No description provided for @errorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorTitle;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'Offline — showing saved data'**
  String get offlineBanner;

  /// No description provided for @forbiddenTitle.
  ///
  /// In en, this message translates to:
  /// **'No access'**
  String get forbiddenTitle;

  /// No description provided for @forbiddenBody.
  ///
  /// In en, this message translates to:
  /// **'Your role does not include this area. Ask an admin if you need it.'**
  String get forbiddenBody;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get navHome;

  /// No description provided for @navNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get navNotifications;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @navMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get navMore;

  /// No description provided for @navMenu.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get navMenu;

  /// No description provided for @navGroupWork.
  ///
  /// In en, this message translates to:
  /// **'Work'**
  String get navGroupWork;

  /// No description provided for @navGroupContent.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get navGroupContent;

  /// No description provided for @navGroupClients.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get navGroupClients;

  /// No description provided for @navGroupAutomate.
  ///
  /// In en, this message translates to:
  /// **'Automate'**
  String get navGroupAutomate;

  /// No description provided for @navGroupMoney.
  ///
  /// In en, this message translates to:
  /// **'Money'**
  String get navGroupMoney;

  /// No description provided for @navGroupAgency.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get navGroupAgency;

  /// No description provided for @navMoreEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing else is available for your role yet.'**
  String get navMoreEmpty;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String homeGreeting(String name);

  /// No description provided for @homeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Here is what needs you today.'**
  String get homeSubtitle;

  /// No description provided for @homeAccessSummary.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No permissions granted} =1{1 permission granted} other{{count} permissions granted}}'**
  String homeAccessSummary(int count);

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'You are all caught up'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'New assignments, approvals and feedback will show up here.'**
  String get notificationsEmptyBody;

  /// No description provided for @notificationsMarkAll.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notificationsMarkAll;

  /// No description provided for @notificationsUnread.
  ///
  /// In en, this message translates to:
  /// **'{count} unread'**
  String notificationsUnread(int count);

  /// No description provided for @notificationsMarkRead.
  ///
  /// In en, this message translates to:
  /// **'Mark as read'**
  String get notificationsMarkRead;

  /// No description provided for @notificationTypeTaskAssigned.
  ///
  /// In en, this message translates to:
  /// **'Task assigned'**
  String get notificationTypeTaskAssigned;

  /// No description provided for @notificationTypeContentApproved.
  ///
  /// In en, this message translates to:
  /// **'Content approved'**
  String get notificationTypeContentApproved;

  /// No description provided for @notificationTypeContentChangesRequested.
  ///
  /// In en, this message translates to:
  /// **'Changes requested'**
  String get notificationTypeContentChangesRequested;

  /// No description provided for @notificationTypeOther.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get notificationTypeOther;

  /// No description provided for @notificationChannelName.
  ///
  /// In en, this message translates to:
  /// **'Agency updates'**
  String get notificationChannelName;

  /// No description provided for @notificationChannelDescription.
  ///
  /// In en, this message translates to:
  /// **'Assignments, approvals and feedback from your agency workspace'**
  String get notificationChannelDescription;

  /// No description provided for @notificationsOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get notificationsOpen;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get settingsProfile;

  /// No description provided for @profileJobTitle.
  ///
  /// In en, this message translates to:
  /// **'Job title'**
  String get profileJobTitle;

  /// No description provided for @settingsAppearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get settingsAppearance;

  /// No description provided for @settingsAppearanceBody.
  ///
  /// In en, this message translates to:
  /// **'Theme, colours and density'**
  String get settingsAppearanceBody;

  /// No description provided for @settingsNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notification preferences'**
  String get settingsNotifications;

  /// No description provided for @settingsNotificationsBody.
  ///
  /// In en, this message translates to:
  /// **'Choose how you hear about each update'**
  String get settingsNotificationsBody;

  /// No description provided for @settingsSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get settingsSignOut;

  /// No description provided for @settingsSignOutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Sign out of WhizSuite on this device?'**
  String get settingsSignOutConfirm;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @create.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get viewAll;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @savedToast.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get savedToast;

  /// No description provided for @createdToast.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get createdToast;

  /// No description provided for @quickCreateTitle.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get quickCreateTitle;

  /// No description provided for @quickCreateSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Start something new without leaving your flow.'**
  String get quickCreateSubtitle;

  /// No description provided for @quickCreateEmpty.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission to create anything yet.'**
  String get quickCreateEmpty;

  /// No description provided for @quickCreateTask.
  ///
  /// In en, this message translates to:
  /// **'New task'**
  String get quickCreateTask;

  /// No description provided for @quickCreateContent.
  ///
  /// In en, this message translates to:
  /// **'New post'**
  String get quickCreateContent;

  /// No description provided for @quickCreateProject.
  ///
  /// In en, this message translates to:
  /// **'New project'**
  String get quickCreateProject;

  /// No description provided for @quickCreateClient.
  ///
  /// In en, this message translates to:
  /// **'New client'**
  String get quickCreateClient;

  /// No description provided for @quickCreateLead.
  ///
  /// In en, this message translates to:
  /// **'New lead'**
  String get quickCreateLead;

  /// No description provided for @quickCreateInvoice.
  ///
  /// In en, this message translates to:
  /// **'New invoice'**
  String get quickCreateInvoice;

  /// No description provided for @quickCreateShoot.
  ///
  /// In en, this message translates to:
  /// **'Plan shoot'**
  String get quickCreateShoot;

  /// No description provided for @deletedToast.
  ///
  /// In en, this message translates to:
  /// **'Deleted'**
  String get deletedToast;

  /// No description provided for @deleteConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String deleteConfirmTitle(String name);

  /// No description provided for @deleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This cannot be undone.'**
  String get deleteConfirmBody;

  /// No description provided for @moreActions.
  ///
  /// In en, this message translates to:
  /// **'More actions'**
  String get moreActions;

  /// No description provided for @unassigned.
  ///
  /// In en, this message translates to:
  /// **'Unassigned'**
  String get unassigned;

  /// No description provided for @noDueDate.
  ///
  /// In en, this message translates to:
  /// **'No due date'**
  String get noDueDate;

  /// No description provided for @valueNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get valueNone;

  /// No description provided for @valueClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get valueClear;

  /// No description provided for @valueAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get valueAdd;

  /// No description provided for @valueRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove {value}'**
  String valueRemove(String value);

  /// No description provided for @valueUnknown.
  ///
  /// In en, this message translates to:
  /// **'—'**
  String get valueUnknown;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get searchHint;

  /// No description provided for @searchNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No matches'**
  String get searchNoMatches;

  /// No description provided for @searchNoMatchesBody.
  ///
  /// In en, this message translates to:
  /// **'Try a different search or filter.'**
  String get searchNoMatchesBody;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @timeJustNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get timeJustNow;

  /// No description provided for @timeMinutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{count}m ago'**
  String timeMinutesAgo(int count);

  /// No description provided for @timeHoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{count}h ago'**
  String timeHoursAgo(int count);

  /// No description provided for @timeDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'{count}d ago'**
  String timeDaysAgo(int count);

  /// No description provided for @timeInMinutes.
  ///
  /// In en, this message translates to:
  /// **'in {count}m'**
  String timeInMinutes(int count);

  /// No description provided for @timeInHours.
  ///
  /// In en, this message translates to:
  /// **'in {count}h'**
  String timeInHours(int count);

  /// No description provided for @timeInDays.
  ///
  /// In en, this message translates to:
  /// **'in {count}d'**
  String timeInDays(int count);

  /// No description provided for @dueToday.
  ///
  /// In en, this message translates to:
  /// **'Due today'**
  String get dueToday;

  /// No description provided for @dueTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Due tomorrow'**
  String get dueTomorrow;

  /// No description provided for @dueInDays.
  ///
  /// In en, this message translates to:
  /// **'Due in {count}d'**
  String dueInDays(int count);

  /// No description provided for @dueOverdue.
  ///
  /// In en, this message translates to:
  /// **'{count}d overdue'**
  String dueOverdue(int count);

  /// No description provided for @durationMinutes.
  ///
  /// In en, this message translates to:
  /// **'{minutes}m'**
  String durationMinutes(int minutes);

  /// No description provided for @durationHours.
  ///
  /// In en, this message translates to:
  /// **'{hours}h'**
  String durationHours(int hours);

  /// No description provided for @durationHoursMinutes.
  ///
  /// In en, this message translates to:
  /// **'{hours}h {minutes}m'**
  String durationHoursMinutes(int hours, int minutes);

  /// No description provided for @fileSizeKb.
  ///
  /// In en, this message translates to:
  /// **'{size} KB'**
  String fileSizeKb(int size);

  /// No description provided for @fileSizeMb.
  ///
  /// In en, this message translates to:
  /// **'{size} MB'**
  String fileSizeMb(String size);

  /// No description provided for @preferencesTitle.
  ///
  /// In en, this message translates to:
  /// **'Notification preferences'**
  String get preferencesTitle;

  /// No description provided for @preferencesBody.
  ///
  /// In en, this message translates to:
  /// **'Pick the channels for each kind of update. Push needs notifications allowed on this device.'**
  String get preferencesBody;

  /// No description provided for @channelInApp.
  ///
  /// In en, this message translates to:
  /// **'In-app'**
  String get channelInApp;

  /// No description provided for @channelEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get channelEmail;

  /// No description provided for @channelPush.
  ///
  /// In en, this message translates to:
  /// **'Push'**
  String get channelPush;

  /// No description provided for @preferencesSaved.
  ///
  /// In en, this message translates to:
  /// **'Preferences saved'**
  String get preferencesSaved;

  /// No description provided for @themeTitle.
  ///
  /// In en, this message translates to:
  /// **'Make it yours'**
  String get themeTitle;

  /// No description provided for @themeDescription.
  ///
  /// In en, this message translates to:
  /// **'Pick a preset or fine-tune every colour. Changes apply instantly and are remembered on this device.'**
  String get themeDescription;

  /// No description provided for @themePresets.
  ///
  /// In en, this message translates to:
  /// **'Presets'**
  String get themePresets;

  /// No description provided for @themePresetsLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themePresetsLight;

  /// No description provided for @themePresetsDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themePresetsDark;

  /// No description provided for @themePresetEditorial.
  ///
  /// In en, this message translates to:
  /// **'Editorial'**
  String get themePresetEditorial;

  /// No description provided for @themePresetChalk.
  ///
  /// In en, this message translates to:
  /// **'Chalk'**
  String get themePresetChalk;

  /// No description provided for @themePresetPorcelain.
  ///
  /// In en, this message translates to:
  /// **'Porcelain'**
  String get themePresetPorcelain;

  /// No description provided for @themePresetMist.
  ///
  /// In en, this message translates to:
  /// **'Mist'**
  String get themePresetMist;

  /// No description provided for @themePresetDaylight.
  ///
  /// In en, this message translates to:
  /// **'Daylight'**
  String get themePresetDaylight;

  /// No description provided for @themePresetSage.
  ///
  /// In en, this message translates to:
  /// **'Sage'**
  String get themePresetSage;

  /// No description provided for @themePresetSky.
  ///
  /// In en, this message translates to:
  /// **'Sky'**
  String get themePresetSky;

  /// No description provided for @themePresetLinen.
  ///
  /// In en, this message translates to:
  /// **'Linen'**
  String get themePresetLinen;

  /// No description provided for @themePresetNoir.
  ///
  /// In en, this message translates to:
  /// **'Noir'**
  String get themePresetNoir;

  /// No description provided for @themePresetMono.
  ///
  /// In en, this message translates to:
  /// **'Monochrome'**
  String get themePresetMono;

  /// No description provided for @themePresetAurora.
  ///
  /// In en, this message translates to:
  /// **'Aurora'**
  String get themePresetAurora;

  /// No description provided for @themePresetOcean.
  ///
  /// In en, this message translates to:
  /// **'Ocean'**
  String get themePresetOcean;

  /// No description provided for @themePresetSunset.
  ///
  /// In en, this message translates to:
  /// **'Sunset'**
  String get themePresetSunset;

  /// No description provided for @themePresetRose.
  ///
  /// In en, this message translates to:
  /// **'Rose'**
  String get themePresetRose;

  /// No description provided for @themeColors.
  ///
  /// In en, this message translates to:
  /// **'Colours'**
  String get themeColors;

  /// No description provided for @themeColorPrimary.
  ///
  /// In en, this message translates to:
  /// **'Primary'**
  String get themeColorPrimary;

  /// No description provided for @themeColorSecondary.
  ///
  /// In en, this message translates to:
  /// **'Secondary'**
  String get themeColorSecondary;

  /// No description provided for @themeColorBg.
  ///
  /// In en, this message translates to:
  /// **'Background'**
  String get themeColorBg;

  /// No description provided for @themeColorSurface.
  ///
  /// In en, this message translates to:
  /// **'Surface'**
  String get themeColorSurface;

  /// No description provided for @themeColorBorder.
  ///
  /// In en, this message translates to:
  /// **'Border'**
  String get themeColorBorder;

  /// No description provided for @themeColorFg.
  ///
  /// In en, this message translates to:
  /// **'Primary text'**
  String get themeColorFg;

  /// No description provided for @themeColorMuted.
  ///
  /// In en, this message translates to:
  /// **'Muted text'**
  String get themeColorMuted;

  /// No description provided for @themeShape.
  ///
  /// In en, this message translates to:
  /// **'Shape & density'**
  String get themeShape;

  /// No description provided for @themeRadius.
  ///
  /// In en, this message translates to:
  /// **'Corner radius'**
  String get themeRadius;

  /// No description provided for @themeDensity.
  ///
  /// In en, this message translates to:
  /// **'Density'**
  String get themeDensity;

  /// No description provided for @themeDensityComfortable.
  ///
  /// In en, this message translates to:
  /// **'Comfortable'**
  String get themeDensityComfortable;

  /// No description provided for @themeDensityCompact.
  ///
  /// In en, this message translates to:
  /// **'Compact'**
  String get themeDensityCompact;

  /// No description provided for @themeReset.
  ///
  /// In en, this message translates to:
  /// **'Reset to default'**
  String get themeReset;

  /// No description provided for @themeHexLabel.
  ///
  /// In en, this message translates to:
  /// **'Hex colour'**
  String get themeHexLabel;

  /// No description provided for @themeHexInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use the #RRGGBB format'**
  String get themeHexInvalid;

  /// No description provided for @themeApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get themeApply;

  /// No description provided for @navApprovals.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get navApprovals;

  /// No description provided for @approvalsTitle.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get approvalsTitle;

  /// No description provided for @approvalsDescription.
  ///
  /// In en, this message translates to:
  /// **'Everything waiting for a decision. Approve in one tap or tell the author what to fix.'**
  String get approvalsDescription;

  /// No description provided for @approvalsDescriptionViewer.
  ///
  /// In en, this message translates to:
  /// **'Requests you submitted that are waiting for a decision.'**
  String get approvalsDescriptionViewer;

  /// No description provided for @approvalsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search subject, requester or step'**
  String get approvalsSearch;

  /// No description provided for @approvalsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing to review'**
  String get approvalsEmpty;

  /// No description provided for @approvalsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'When content or other work is sent for approval, it will appear here.'**
  String get approvalsEmptyBody;

  /// No description provided for @approvalsStatPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get approvalsStatPending;

  /// No description provided for @approvalsStatPendingHint.
  ///
  /// In en, this message translates to:
  /// **'Waiting on a decision'**
  String get approvalsStatPendingHint;

  /// No description provided for @approvalsStatOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get approvalsStatOverdue;

  /// No description provided for @approvalsStatOverdueHint.
  ///
  /// In en, this message translates to:
  /// **'Past their due date'**
  String get approvalsStatOverdueHint;

  /// No description provided for @approvalsStatDone.
  ///
  /// In en, this message translates to:
  /// **'Decided'**
  String get approvalsStatDone;

  /// No description provided for @approvalsStatDoneHint.
  ///
  /// In en, this message translates to:
  /// **'Approved, rejected or changes requested'**
  String get approvalsStatDoneHint;

  /// No description provided for @approvalStepsProgress.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total}'**
  String approvalStepsProgress(int done, int total);

  /// No description provided for @approvalStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING{Pending} APPROVED{Approved} REJECTED{Rejected} CHANGES_REQUESTED{Changes requested} other{{status}}}'**
  String approvalStatus(String status);

  /// No description provided for @approvalSubjectType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, CONTENT{Content} CLIENT{Client} other{{type}}}'**
  String approvalSubjectType(String type);

  /// No description provided for @approvalSubjectFallback.
  ///
  /// In en, this message translates to:
  /// **'{type} approval'**
  String approvalSubjectFallback(String type);

  /// No description provided for @approvalRequester.
  ///
  /// In en, this message translates to:
  /// **'Requested by {name}'**
  String approvalRequester(String name);

  /// No description provided for @approvalRequesterUnknown.
  ///
  /// In en, this message translates to:
  /// **'Requested by a teammate'**
  String get approvalRequesterUnknown;

  /// No description provided for @approvalDue.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String approvalDue(String date);

  /// No description provided for @approvalDueLabel.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get approvalDueLabel;

  /// No description provided for @approvalNoDue.
  ///
  /// In en, this message translates to:
  /// **'No due date'**
  String get approvalNoDue;

  /// No description provided for @approvalRequestedAgo.
  ///
  /// In en, this message translates to:
  /// **'Requested {time}'**
  String approvalRequestedAgo(String time);

  /// No description provided for @approvalCurrentStep.
  ///
  /// In en, this message translates to:
  /// **'Current step'**
  String get approvalCurrentStep;

  /// No description provided for @approvalStepsTitle.
  ///
  /// In en, this message translates to:
  /// **'Steps'**
  String get approvalStepsTitle;

  /// No description provided for @approvalTimelineTitle.
  ///
  /// In en, this message translates to:
  /// **'Activity'**
  String get approvalTimelineTitle;

  /// No description provided for @approvalTimelineEmpty.
  ///
  /// In en, this message translates to:
  /// **'No decisions recorded yet.'**
  String get approvalTimelineEmpty;

  /// No description provided for @approvalOpenSubject.
  ///
  /// In en, this message translates to:
  /// **'Open subject'**
  String get approvalOpenSubject;

  /// No description provided for @approvalDecideTitle.
  ///
  /// In en, this message translates to:
  /// **'Your decision'**
  String get approvalDecideTitle;

  /// No description provided for @approvalActionApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get approvalActionApprove;

  /// No description provided for @approvalActionReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get approvalActionReject;

  /// No description provided for @approvalActionRequestChanges.
  ///
  /// In en, this message translates to:
  /// **'Request changes'**
  String get approvalActionRequestChanges;

  /// No description provided for @approvalComment.
  ///
  /// In en, this message translates to:
  /// **'Comment'**
  String get approvalComment;

  /// No description provided for @approvalCommentHint.
  ///
  /// In en, this message translates to:
  /// **'Optional note for the requester'**
  String get approvalCommentHint;

  /// No description provided for @approvalCommentRequiredHint.
  ///
  /// In en, this message translates to:
  /// **'Tell them what to change'**
  String get approvalCommentRequiredHint;

  /// No description provided for @approvalApproveConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Approve this request?'**
  String get approvalApproveConfirmTitle;

  /// No description provided for @approvalApproveConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'The next step will start, or the request will complete if this is the last step.'**
  String get approvalApproveConfirmBody;

  /// No description provided for @approvalRejectTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject request'**
  String get approvalRejectTitle;

  /// No description provided for @approvalChangesTitle.
  ///
  /// In en, this message translates to:
  /// **'Request changes'**
  String get approvalChangesTitle;

  /// No description provided for @approvalApprovedToast.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get approvalApprovedToast;

  /// No description provided for @approvalRejectedToast.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get approvalRejectedToast;

  /// No description provided for @approvalChangesToast.
  ///
  /// In en, this message translates to:
  /// **'Changes requested'**
  String get approvalChangesToast;

  /// No description provided for @approvalRule.
  ///
  /// In en, this message translates to:
  /// **'{rule, select, ANY{Any named approver} ALL{Every named approver} other{{rule}}}'**
  String approvalRule(String rule);

  /// No description provided for @approvalStepPending.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get approvalStepPending;

  /// No description provided for @approvalStepDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get approvalStepDone;

  /// No description provided for @approvalNotApprover.
  ///
  /// In en, this message translates to:
  /// **'You are not listed as an approver for the current step.'**
  String get approvalNotApprover;

  /// No description provided for @approvalWaitingDecision.
  ///
  /// In en, this message translates to:
  /// **'Waiting for an approver.'**
  String get approvalWaitingDecision;

  /// No description provided for @approvalAlreadyDecided.
  ///
  /// In en, this message translates to:
  /// **'This request is already {status}.'**
  String approvalAlreadyDecided(String status);

  /// No description provided for @approvalActionBy.
  ///
  /// In en, this message translates to:
  /// **'{action} by {name}'**
  String approvalActionBy(String action, String name);

  /// No description provided for @approvalActionLabel.
  ///
  /// In en, this message translates to:
  /// **'{action, select, APPROVED{Approved} REJECTED{Rejected} CHANGES_REQUESTED{Changes requested} other{{action}}}'**
  String approvalActionLabel(String action);

  /// No description provided for @navAudit.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get navAudit;

  /// No description provided for @auditTitle.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get auditTitle;

  /// No description provided for @auditSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Every change, sign-in and permission update in your agency, newest first.'**
  String get auditSubtitle;

  /// No description provided for @auditSearch.
  ///
  /// In en, this message translates to:
  /// **'Search by person, action, record or request ID'**
  String get auditSearch;

  /// No description provided for @auditEmpty.
  ///
  /// In en, this message translates to:
  /// **'No activity recorded yet'**
  String get auditEmpty;

  /// No description provided for @auditEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Actions taken in your workspace will be recorded here automatically.'**
  String get auditEmptyBody;

  /// No description provided for @auditStatLoaded.
  ///
  /// In en, this message translates to:
  /// **'Loaded'**
  String get auditStatLoaded;

  /// No description provided for @auditStatFailures.
  ///
  /// In en, this message translates to:
  /// **'Failures'**
  String get auditStatFailures;

  /// No description provided for @auditStatActors.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get auditStatActors;

  /// No description provided for @auditNoMatchesLoaded.
  ///
  /// In en, this message translates to:
  /// **'Nothing in the loaded history matches. Load older events to search further back.'**
  String get auditNoMatchesLoaded;

  /// No description provided for @auditLoadMore.
  ///
  /// In en, this message translates to:
  /// **'Load older events'**
  String get auditLoadMore;

  /// No description provided for @auditLoadingMore.
  ///
  /// In en, this message translates to:
  /// **'Loading older events'**
  String get auditLoadingMore;

  /// No description provided for @auditEnd.
  ///
  /// In en, this message translates to:
  /// **'You have reached the beginning of the log'**
  String get auditEnd;

  /// No description provided for @auditResultCount.
  ///
  /// In en, this message translates to:
  /// **'{shown, plural, =0{No events} =1{1 event} other{{shown} events}}{failures, plural, =0{} =1{ · 1 failed} other{ · {failures} failed}}'**
  String auditResultCount(int shown, int failures);

  /// No description provided for @auditFilters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get auditFilters;

  /// No description provided for @auditFiltersBody.
  ///
  /// In en, this message translates to:
  /// **'Filters apply to the events loaded so far.'**
  String get auditFiltersBody;

  /// No description provided for @auditClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get auditClearFilters;

  /// No description provided for @auditApplyFilters.
  ///
  /// In en, this message translates to:
  /// **'Show results'**
  String get auditApplyFilters;

  /// No description provided for @auditRangeLabel.
  ///
  /// In en, this message translates to:
  /// **'Time range'**
  String get auditRangeLabel;

  /// No description provided for @auditRangeAll.
  ///
  /// In en, this message translates to:
  /// **'All time'**
  String get auditRangeAll;

  /// No description provided for @auditRangeDays.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{Last 24 hours} other{Last {days} days}}'**
  String auditRangeDays(int days);

  /// No description provided for @auditOutcomeLabel.
  ///
  /// In en, this message translates to:
  /// **'Outcome'**
  String get auditOutcomeLabel;

  /// No description provided for @auditOutcome.
  ///
  /// In en, this message translates to:
  /// **'{outcome, select, SUCCESS{Succeeded} FAILURE{Failed} other{{outcome}}}'**
  String auditOutcome(String outcome);

  /// No description provided for @auditActor.
  ///
  /// In en, this message translates to:
  /// **'Performed by'**
  String get auditActor;

  /// No description provided for @auditActorId.
  ///
  /// In en, this message translates to:
  /// **'Actor ID'**
  String get auditActorId;

  /// No description provided for @auditActorTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Actor type'**
  String get auditActorTypeLabel;

  /// No description provided for @auditActorType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, user{Unknown person} system{System} service{Integration} other{{type}}}'**
  String auditActorType(String type);

  /// No description provided for @auditUnknownActor.
  ///
  /// In en, this message translates to:
  /// **'Unknown person'**
  String get auditUnknownActor;

  /// No description provided for @auditAction.
  ///
  /// In en, this message translates to:
  /// **'Action'**
  String get auditAction;

  /// No description provided for @auditEntity.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get auditEntity;

  /// No description provided for @auditEntityId.
  ///
  /// In en, this message translates to:
  /// **'Record ID'**
  String get auditEntityId;

  /// No description provided for @auditWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get auditWhen;

  /// No description provided for @auditIp.
  ///
  /// In en, this message translates to:
  /// **'IP address'**
  String get auditIp;

  /// No description provided for @auditUserAgent.
  ///
  /// In en, this message translates to:
  /// **'Device'**
  String get auditUserAgent;

  /// No description provided for @auditCorrelation.
  ///
  /// In en, this message translates to:
  /// **'Request ID'**
  String get auditCorrelation;

  /// No description provided for @auditCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get auditCopy;

  /// No description provided for @auditCopied.
  ///
  /// In en, this message translates to:
  /// **'Copied to clipboard'**
  String get auditCopied;

  /// No description provided for @auditSectionEvent.
  ///
  /// In en, this message translates to:
  /// **'Event'**
  String get auditSectionEvent;

  /// No description provided for @auditSectionRequest.
  ///
  /// In en, this message translates to:
  /// **'Request'**
  String get auditSectionRequest;

  /// No description provided for @auditSectionChanges.
  ///
  /// In en, this message translates to:
  /// **'Changes'**
  String get auditSectionChanges;

  /// No description provided for @auditSectionMetadata.
  ///
  /// In en, this message translates to:
  /// **'Additional details'**
  String get auditSectionMetadata;

  /// No description provided for @auditNoChanges.
  ///
  /// In en, this message translates to:
  /// **'No before or after snapshot was recorded for this event.'**
  String get auditNoChanges;

  /// No description provided for @auditChangedFields.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No fields changed} =1{1 field changed} other{{count} fields changed}}'**
  String auditChangedFields(int count);

  /// No description provided for @auditShowUnchanged.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Show 1 unchanged field} other{Show {count} unchanged fields}}'**
  String auditShowUnchanged(int count);

  /// No description provided for @auditHideUnchanged.
  ///
  /// In en, this message translates to:
  /// **'Hide unchanged fields'**
  String get auditHideUnchanged;

  /// No description provided for @auditBefore.
  ///
  /// In en, this message translates to:
  /// **'Before'**
  String get auditBefore;

  /// No description provided for @auditAfter.
  ///
  /// In en, this message translates to:
  /// **'After'**
  String get auditAfter;

  /// No description provided for @auditChangeKind.
  ///
  /// In en, this message translates to:
  /// **'{kind, select, added{Added} removed{Removed} changed{Changed} other{Unchanged}}'**
  String auditChangeKind(String kind);

  /// No description provided for @auditEntityType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, k_user{Person} k_session{Session} k_membership{Membership} k_invitation{Invitation} k_role{Role} k_workspace{Workspace} k_department{Department} k_team{Team} k_client{Client} k_brand_kit{Brand kit} k_project{Project} k_task{Task} k_lead{Lead} k_invoice{Invoice} k_article{Article} k_reports{Report} k_report{Report} k_templates{Template} k_template{Template} k_automations{Automation} k_automation{Automation} k_automationVersion{Automation version} k_automationRun{Automation run} k_workflows{Workflow} k_workflow{Workflow} k_approvals{Approval} k_approval{Approval} k_feedbackThread{Feedback thread} k_feedbackComment{Feedback comment} k_contentVariant{Content variant} k_metricSnapshot{Metric snapshot} k_activity{Activity} k_activityEvent{Activity} k_notification{Notification} k_notification_preference{Notification preference} k_auth{Sign-in} k_subscription{Subscription} k_http_request{API request} other{{fallback}}}'**
  String auditEntityType(String type, String fallback);

  /// No description provided for @auditVerb.
  ///
  /// In en, this message translates to:
  /// **'{verb, select, k_create{Created} k_update{Updated} k_delete{Deleted} k_archive{Archived} k_publish{Published} k_run{Ran} k_register{Signed up} k_refresh{Session refreshed} k_login{Signed in} k_logout{Signed out} k_login_failed{Sign-in failed} k_profile_update{Profile updated} k_role_change{Access level changed} k_roles_assign{Roles assigned} k_deactivate{Deactivated} k_send{Invitation sent} k_revoke{Revoked} k_accept{Accepted} k_request{Requested} k_act{Responded} k_transition{Status changed} k_preference_update{Preferences updated} k_device_register{Device registered} k_device_remove{Device removed} other{{fallback}}}'**
  String auditVerb(String verb, String fallback);

  /// No description provided for @navAutomations.
  ///
  /// In en, this message translates to:
  /// **'Automations'**
  String get navAutomations;

  /// No description provided for @automationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Automations'**
  String get automationsTitle;

  /// No description provided for @automationsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search automations'**
  String get automationsSearch;

  /// No description provided for @automationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No automations yet'**
  String get automationsEmpty;

  /// No description provided for @automationsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Let routine work run itself — when something happens, do something useful. Start from a recipe or create your own.'**
  String get automationsEmptyBody;

  /// No description provided for @automationNew.
  ///
  /// In en, this message translates to:
  /// **'New automation'**
  String get automationNew;

  /// No description provided for @automationEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit automation'**
  String get automationEdit;

  /// No description provided for @automationTabRules.
  ///
  /// In en, this message translates to:
  /// **'Rules'**
  String get automationTabRules;

  /// No description provided for @automationTabRuns.
  ///
  /// In en, this message translates to:
  /// **'Run history'**
  String get automationTabRuns;

  /// No description provided for @automationName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get automationName;

  /// No description provided for @automationNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Notify client when content is ready'**
  String get automationNameHint;

  /// No description provided for @automationTriggerField.
  ///
  /// In en, this message translates to:
  /// **'When this happens'**
  String get automationTriggerField;

  /// No description provided for @automationActionField.
  ///
  /// In en, this message translates to:
  /// **'Do this'**
  String get automationActionField;

  /// No description provided for @automationStatusField.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get automationStatusField;

  /// No description provided for @automationEnabledLabel.
  ///
  /// In en, this message translates to:
  /// **'Turned on'**
  String get automationEnabledLabel;

  /// No description provided for @automationEnabledHint.
  ///
  /// In en, this message translates to:
  /// **'Paused automations keep their history and can be resumed any time.'**
  String get automationEnabledHint;

  /// No description provided for @automationTrigger.
  ///
  /// In en, this message translates to:
  /// **'{trigger, select, content_submitted{content is sent for review} content_approved{content is approved} content_published{content is published} task_overdue{a task becomes overdue} invoice_overdue{an invoice becomes overdue} lead_won{a lead is won} inbox_negative{a negative message arrives} other{{trigger}}}'**
  String automationTrigger(String trigger);

  /// No description provided for @automationAction.
  ///
  /// In en, this message translates to:
  /// **'{action, select, notify_client{notify the client} notify_team{notify the team} create_task{create a task} send_email{send an email} post_webhook{post to a webhook} other{{action}}}'**
  String automationAction(String action);

  /// No description provided for @automationStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, ACTIVE{Active} PAUSED{Paused} ARCHIVED{Archived} other{{status}}}'**
  String automationStatus(String status);

  /// No description provided for @automationWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get automationWhen;

  /// No description provided for @automationThen.
  ///
  /// In en, this message translates to:
  /// **'then'**
  String get automationThen;

  /// No description provided for @automationSentence.
  ///
  /// In en, this message translates to:
  /// **'When {trigger}, then {action}'**
  String automationSentence(String trigger, String action);

  /// No description provided for @automationToggle.
  ///
  /// In en, this message translates to:
  /// **'Turn {name} on or off'**
  String automationToggle(String name);

  /// No description provided for @automationEnabledToast.
  ///
  /// In en, this message translates to:
  /// **'Automation turned on'**
  String get automationEnabledToast;

  /// No description provided for @automationPausedToast.
  ///
  /// In en, this message translates to:
  /// **'Automation paused'**
  String get automationPausedToast;

  /// No description provided for @automationStatRuns.
  ///
  /// In en, this message translates to:
  /// **'Runs'**
  String get automationStatRuns;

  /// No description provided for @automationStatFailures.
  ///
  /// In en, this message translates to:
  /// **'Failures'**
  String get automationStatFailures;

  /// No description provided for @automationStatLastRun.
  ///
  /// In en, this message translates to:
  /// **'Last run'**
  String get automationStatLastRun;

  /// No description provided for @automationNever.
  ///
  /// In en, this message translates to:
  /// **'Never'**
  String get automationNever;

  /// No description provided for @automationNoRunsYet.
  ///
  /// In en, this message translates to:
  /// **'Not run yet'**
  String get automationNoRunsYet;

  /// No description provided for @automationSuccessRate.
  ///
  /// In en, this message translates to:
  /// **'Success rate'**
  String get automationSuccessRate;

  /// No description provided for @automationKpiActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get automationKpiActive;

  /// No description provided for @automationKpiActiveOf.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{none set up} =1{of 1 total} other{of {count} total}}'**
  String automationKpiActiveOf(int count);

  /// No description provided for @automationKpiRuns.
  ///
  /// In en, this message translates to:
  /// **'Total runs'**
  String get automationKpiRuns;

  /// No description provided for @automationRecipesTitle.
  ///
  /// In en, this message translates to:
  /// **'Start from a recipe'**
  String get automationRecipesTitle;

  /// No description provided for @automationRecipeAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get automationRecipeAdd;

  /// No description provided for @automationRecipeName.
  ///
  /// In en, this message translates to:
  /// **'{recipe, select, clientReview{Tell the client when content is ready} approvalTask{Create a task after approval} overdueAlert{Alert the team about overdue tasks} dunning{Remind clients about overdue invoices} welcome{Kick off onboarding when a deal is won} escalate{Escalate negative comments} other{{recipe}}}'**
  String automationRecipeName(String recipe);

  /// No description provided for @automationRecipeDescription.
  ///
  /// In en, this message translates to:
  /// **'{recipe, select, clientReview{Notify the client as soon as a post is sent for approval.} approvalTask{Schedule follow-up work the moment content is approved.} overdueAlert{Nudge the team when a task slips past its due date.} dunning{Email a polite reminder when an invoice is late.} welcome{Create an onboarding task as soon as a lead is marked Won.} escalate{Post to your team channel when a conversation turns negative.} other{{recipe}}}'**
  String automationRecipeDescription(String recipe);

  /// No description provided for @automationFlowTitle.
  ///
  /// In en, this message translates to:
  /// **'How it works'**
  String get automationFlowTitle;

  /// No description provided for @automationConfigTitle.
  ///
  /// In en, this message translates to:
  /// **'Configuration'**
  String get automationConfigTitle;

  /// No description provided for @automationCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get automationCreated;

  /// No description provided for @automationUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last changed'**
  String get automationUpdated;

  /// No description provided for @automationRecentRuns.
  ///
  /// In en, this message translates to:
  /// **'Recent runs'**
  String get automationRecentRuns;

  /// No description provided for @automationRunNow.
  ///
  /// In en, this message translates to:
  /// **'Run now'**
  String get automationRunNow;

  /// No description provided for @automationRunTitle.
  ///
  /// In en, this message translates to:
  /// **'Run {name}'**
  String automationRunTitle(String name);

  /// No description provided for @automationRunDetail.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get automationRunDetail;

  /// No description provided for @automationRunDetailHint.
  ///
  /// In en, this message translates to:
  /// **'Saved with the run so the team knows why it ran.'**
  String get automationRunDetailHint;

  /// No description provided for @automationRunManualDetail.
  ///
  /// In en, this message translates to:
  /// **'Run manually: {name}'**
  String automationRunManualDetail(String name);

  /// No description provided for @automationRunDone.
  ///
  /// In en, this message translates to:
  /// **'{name} ran successfully'**
  String automationRunDone(String name);

  /// No description provided for @automationPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get automationPublish;

  /// No description provided for @automationPublished.
  ///
  /// In en, this message translates to:
  /// **'Published as version {version}'**
  String automationPublished(int version);

  /// No description provided for @automationDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'The automation stops running. Its run history is kept.'**
  String get automationDeleteBody;

  /// No description provided for @automationRunsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search runs'**
  String get automationRunsSearch;

  /// No description provided for @automationRunsFailedOnly.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Failed only} other{Failed only · {count}}}'**
  String automationRunsFailedOnly(int count);

  /// No description provided for @automationRunsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing has run yet'**
  String get automationRunsEmpty;

  /// No description provided for @automationRunsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Runs appear here every time an automation fires or is run by hand.'**
  String get automationRunsEmptyBody;

  /// No description provided for @automationRunOk.
  ///
  /// In en, this message translates to:
  /// **'Succeeded'**
  String get automationRunOk;

  /// No description provided for @automationRunFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get automationRunFailed;

  /// No description provided for @automationRunDeleted.
  ///
  /// In en, this message translates to:
  /// **'Deleted automation'**
  String get automationRunDeleted;

  /// No description provided for @navBilling.
  ///
  /// In en, this message translates to:
  /// **'Plan & billing'**
  String get navBilling;

  /// No description provided for @billingTitle.
  ///
  /// In en, this message translates to:
  /// **'Plan & billing'**
  String get billingTitle;

  /// No description provided for @billingDescription.
  ///
  /// In en, this message translates to:
  /// **'Your organisation\'s plan, limits and catalogue.'**
  String get billingDescription;

  /// No description provided for @billingCurrentPlan.
  ///
  /// In en, this message translates to:
  /// **'Current plan'**
  String get billingCurrentPlan;

  /// No description provided for @billingNoSubscription.
  ///
  /// In en, this message translates to:
  /// **'No active plan'**
  String get billingNoSubscription;

  /// No description provided for @billingNoSubscriptionBody.
  ///
  /// In en, this message translates to:
  /// **'This organisation is not on a paid plan yet. Browse the catalogue below or contact support to get started.'**
  String get billingNoSubscriptionBody;

  /// No description provided for @billingStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, TRIALING{Trial} ACTIVE{Active} PAST_DUE{Past due} CANCELED{Canceled} other{{status}}}'**
  String billingStatus(String status);

  /// No description provided for @billingInterval.
  ///
  /// In en, this message translates to:
  /// **'{interval, select, k_month{Monthly} k_year{Yearly} other{{fallback}}}'**
  String billingInterval(String interval, String fallback);

  /// No description provided for @billingLimit.
  ///
  /// In en, this message translates to:
  /// **'{key, select, k_seats{Team seats} k_clients{Clients} k_channels{Channels} k_storageKb{Storage} k_automationRuns{Automation runs} other{{fallback}}}'**
  String billingLimit(String key, String fallback);

  /// No description provided for @billingFeature.
  ///
  /// In en, this message translates to:
  /// **'{key, select, k_calendar{Calendar} k_approvals{Approvals} k_inbox{Inbox} k_invoices{Invoices} k_reports{Reports} k_whiteLabel{White label} k_support{Priority support} other{{fallback}}}'**
  String billingFeature(String key, String fallback);

  /// No description provided for @billingUnlimited.
  ///
  /// In en, this message translates to:
  /// **'Unlimited'**
  String get billingUnlimited;

  /// No description provided for @billingStorageGb.
  ///
  /// In en, this message translates to:
  /// **'{value} GB'**
  String billingStorageGb(String value);

  /// No description provided for @billingPricePer.
  ///
  /// In en, this message translates to:
  /// **'{price} / {interval}'**
  String billingPricePer(String price, String interval);

  /// No description provided for @billingCustomPrice.
  ///
  /// In en, this message translates to:
  /// **'Custom pricing'**
  String get billingCustomPrice;

  /// No description provided for @billingCharge.
  ///
  /// In en, this message translates to:
  /// **'Charge'**
  String get billingCharge;

  /// No description provided for @billingRenews.
  ///
  /// In en, this message translates to:
  /// **'Renews'**
  String get billingRenews;

  /// No description provided for @billingPeriodEnds.
  ///
  /// In en, this message translates to:
  /// **'Period ends'**
  String get billingPeriodEnds;

  /// No description provided for @billingTrialEnds.
  ///
  /// In en, this message translates to:
  /// **'Trial ends'**
  String get billingTrialEnds;

  /// No description provided for @billingDaysLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Ends today} =1{1 day left} other{{count} days left}}'**
  String billingDaysLeft(int count);

  /// No description provided for @billingPeriodProgress.
  ///
  /// In en, this message translates to:
  /// **'Billing period'**
  String get billingPeriodProgress;

  /// No description provided for @billingLimits.
  ///
  /// In en, this message translates to:
  /// **'Plan limits'**
  String get billingLimits;

  /// No description provided for @billingFeatures.
  ///
  /// In en, this message translates to:
  /// **'Included features'**
  String get billingFeatures;

  /// No description provided for @billingPlans.
  ///
  /// In en, this message translates to:
  /// **'Plans'**
  String get billingPlans;

  /// No description provided for @billingPlansEmpty.
  ///
  /// In en, this message translates to:
  /// **'No plans available'**
  String get billingPlansEmpty;

  /// No description provided for @billingPlansEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'The plan catalogue could not be loaded.'**
  String get billingPlansEmptyBody;

  /// No description provided for @billingManagedNote.
  ///
  /// In en, this message translates to:
  /// **'Plan changes are managed outside the mobile app. Contact your administrator or use the web app to upgrade or downgrade.'**
  String get billingManagedNote;

  /// No description provided for @billingYearlySaving.
  ///
  /// In en, this message translates to:
  /// **'Save up to {percent}% yearly'**
  String billingYearlySaving(int percent);

  /// No description provided for @billingCurrentBadge.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get billingCurrentBadge;

  /// No description provided for @billingLimitUpTo.
  ///
  /// In en, this message translates to:
  /// **'Up to {value}'**
  String billingLimitUpTo(String value);

  /// No description provided for @billingInvoicesUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Invoice history is not available from the API yet.'**
  String get billingInvoicesUnavailable;

  /// No description provided for @navCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get navCalendar;

  /// No description provided for @calendarTitle.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get calendarTitle;

  /// No description provided for @calendarToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get calendarToday;

  /// No description provided for @calendarPreviousMonth.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get calendarPreviousMonth;

  /// No description provided for @calendarNextMonth.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get calendarNextMonth;

  /// No description provided for @calendarModeMonth.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get calendarModeMonth;

  /// No description provided for @calendarModeUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get calendarModeUpcoming;

  /// No description provided for @calendarSource.
  ///
  /// In en, this message translates to:
  /// **'{type, select, MANUAL{Event} CONTENT{Content} TASK{Task} MEETING{Meeting} DEADLINE{Deadline} other{{type}}}'**
  String calendarSource(String type);

  /// No description provided for @calendarVisibility.
  ///
  /// In en, this message translates to:
  /// **'{visibility, select, INTERNAL{Internal only} CLIENT_VISIBLE{Visible to client} other{{visibility}}}'**
  String calendarVisibility(String visibility);

  /// No description provided for @calendarDayEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing scheduled'**
  String get calendarDayEmpty;

  /// No description provided for @calendarDayEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing is planned for this day yet.'**
  String get calendarDayEmptyBody;

  /// No description provided for @calendarUpcomingEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing coming up'**
  String get calendarUpcomingEmpty;

  /// No description provided for @calendarUpcomingEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Events, scheduled content and task deadlines will show up here.'**
  String get calendarUpcomingEmptyBody;

  /// No description provided for @calendarNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No items match these filters.'**
  String get calendarNoMatches;

  /// No description provided for @calendarDaySemantics.
  ///
  /// In en, this message translates to:
  /// **'{date}, {count, plural, =0{nothing scheduled} =1{1 item} other{{count} items}}'**
  String calendarDaySemantics(String date, int count);

  /// No description provided for @calendarDayCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing scheduled} =1{1 item} other{{count} items}}'**
  String calendarDayCount(int count);

  /// No description provided for @calendarMoreItems.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, other{+{count} more}}'**
  String calendarMoreItems(int count);

  /// No description provided for @calendarAllDay.
  ///
  /// In en, this message translates to:
  /// **'All day'**
  String get calendarAllDay;

  /// No description provided for @calendarTimeRange.
  ///
  /// In en, this message translates to:
  /// **'{start} – {end}'**
  String calendarTimeRange(String start, String end);

  /// No description provided for @calendarUntil.
  ///
  /// In en, this message translates to:
  /// **'Until {time}'**
  String calendarUntil(String time);

  /// No description provided for @calendarNew.
  ///
  /// In en, this message translates to:
  /// **'New event'**
  String get calendarNew;

  /// No description provided for @calendarCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get calendarCreate;

  /// No description provided for @calendarNewEventHint.
  ///
  /// In en, this message translates to:
  /// **'Meeting, deadline or manual block'**
  String get calendarNewEventHint;

  /// No description provided for @calendarPlanShoot.
  ///
  /// In en, this message translates to:
  /// **'Plan shoot'**
  String get calendarPlanShoot;

  /// No description provided for @calendarPlanShootHint.
  ///
  /// In en, this message translates to:
  /// **'Shoot day with folders and tasks'**
  String get calendarPlanShootHint;

  /// No description provided for @calendarShootHeading.
  ///
  /// In en, this message translates to:
  /// **'Plan a shoot'**
  String get calendarShootHeading;

  /// No description provided for @calendarShootDesc.
  ///
  /// In en, this message translates to:
  /// **'Schedule a shoot day, optionally create media folders and checklist tasks.'**
  String get calendarShootDesc;

  /// No description provided for @calendarShootSubmit.
  ///
  /// In en, this message translates to:
  /// **'Plan shoot'**
  String get calendarShootSubmit;

  /// No description provided for @calendarShootTitle.
  ///
  /// In en, this message translates to:
  /// **'Shoot title'**
  String get calendarShootTitle;

  /// No description provided for @calendarShootTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Spring campaign on-location'**
  String get calendarShootTitleHint;

  /// No description provided for @calendarShootClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get calendarShootClient;

  /// No description provided for @calendarShootProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get calendarShootProject;

  /// No description provided for @calendarShootStarts.
  ///
  /// In en, this message translates to:
  /// **'Starts'**
  String get calendarShootStarts;

  /// No description provided for @calendarShootEnds.
  ///
  /// In en, this message translates to:
  /// **'Ends'**
  String get calendarShootEnds;

  /// No description provided for @calendarShootCreateFolders.
  ///
  /// In en, this message translates to:
  /// **'Create media folders'**
  String get calendarShootCreateFolders;

  /// No description provided for @calendarShootCreateFoldersHint.
  ///
  /// In en, this message translates to:
  /// **'Raw / Selects / Finals / Deliverables under Shoots'**
  String get calendarShootCreateFoldersHint;

  /// No description provided for @calendarShootTasks.
  ///
  /// In en, this message translates to:
  /// **'Checklist tasks'**
  String get calendarShootTasks;

  /// No description provided for @calendarShootTasksHint.
  ///
  /// In en, this message translates to:
  /// **'One task per line (needs a project)'**
  String get calendarShootTasksHint;

  /// No description provided for @calendarEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit event'**
  String get calendarEdit;

  /// No description provided for @calendarTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get calendarTitleLabel;

  /// No description provided for @calendarTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Campaign kickoff call'**
  String get calendarTitleHint;

  /// No description provided for @calendarTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get calendarTypeLabel;

  /// No description provided for @calendarStarts.
  ///
  /// In en, this message translates to:
  /// **'Starts'**
  String get calendarStarts;

  /// No description provided for @calendarEnds.
  ///
  /// In en, this message translates to:
  /// **'Ends'**
  String get calendarEnds;

  /// No description provided for @calendarEndBeforeStart.
  ///
  /// In en, this message translates to:
  /// **'The end must be after the start.'**
  String get calendarEndBeforeStart;

  /// No description provided for @calendarVisibilityLabel.
  ///
  /// In en, this message translates to:
  /// **'Visibility'**
  String get calendarVisibilityLabel;

  /// No description provided for @calendarClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get calendarClient;

  /// No description provided for @calendarClientLocked.
  ///
  /// In en, this message translates to:
  /// **'The client can\'t be changed after creation.'**
  String get calendarClientLocked;

  /// No description provided for @calendarProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get calendarProject;

  /// No description provided for @calendarWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get calendarWhen;

  /// No description provided for @calendarFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get calendarFilterClient;

  /// No description provided for @calendarFilterType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get calendarFilterType;

  /// No description provided for @calendarFiltersClear.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get calendarFiltersClear;

  /// No description provided for @calendarOpenTask.
  ///
  /// In en, this message translates to:
  /// **'Open task'**
  String get calendarOpenTask;

  /// No description provided for @calendarOpenContent.
  ///
  /// In en, this message translates to:
  /// **'Open content'**
  String get calendarOpenContent;

  /// No description provided for @calendarOpenProject.
  ///
  /// In en, this message translates to:
  /// **'Open project {name}'**
  String calendarOpenProject(String name);

  /// No description provided for @calendarOpenClient.
  ///
  /// In en, this message translates to:
  /// **'Open client {name}'**
  String calendarOpenClient(String name);

  /// No description provided for @calendarPartialSources.
  ///
  /// In en, this message translates to:
  /// **'Some items couldn\'t be loaded. Pull to refresh to try again.'**
  String get calendarPartialSources;

  /// No description provided for @calendarItemDetails.
  ///
  /// In en, this message translates to:
  /// **'Event details'**
  String get calendarItemDetails;

  /// No description provided for @navClients.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get navClients;

  /// No description provided for @clientsTitle.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get clientsTitle;

  /// No description provided for @clientsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search clients'**
  String get clientsSearch;

  /// No description provided for @clientsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No clients yet'**
  String get clientsEmpty;

  /// No description provided for @clientsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add your first client to start planning work, content and invoices for them.'**
  String get clientsEmptyBody;

  /// No description provided for @clientNew.
  ///
  /// In en, this message translates to:
  /// **'New client'**
  String get clientNew;

  /// No description provided for @clientEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit client'**
  String get clientEdit;

  /// No description provided for @clientName.
  ///
  /// In en, this message translates to:
  /// **'Client name'**
  String get clientName;

  /// No description provided for @clientLegalName.
  ///
  /// In en, this message translates to:
  /// **'Legal name'**
  String get clientLegalName;

  /// No description provided for @clientIndustry.
  ///
  /// In en, this message translates to:
  /// **'Industry'**
  String get clientIndustry;

  /// No description provided for @clientWebsite.
  ///
  /// In en, this message translates to:
  /// **'Website'**
  String get clientWebsite;

  /// No description provided for @clientWebsiteHint.
  ///
  /// In en, this message translates to:
  /// **'example.com'**
  String get clientWebsiteHint;

  /// No description provided for @clientTier.
  ///
  /// In en, this message translates to:
  /// **'Tier'**
  String get clientTier;

  /// No description provided for @clientStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get clientStatusLabel;

  /// No description provided for @clientStatusChange.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get clientStatusChange;

  /// No description provided for @clientStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, ONBOARDING{Onboarding} ACTIVE{Active} PAUSED{Paused} CHURNED{Churned} other{{status}}}'**
  String clientStatus(String status);

  /// No description provided for @clientRetainer.
  ///
  /// In en, this message translates to:
  /// **'Monthly retainer'**
  String get clientRetainer;

  /// No description provided for @clientSince.
  ///
  /// In en, this message translates to:
  /// **'Client since'**
  String get clientSince;

  /// No description provided for @clientDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get clientDetails;

  /// No description provided for @clientContacts.
  ///
  /// In en, this message translates to:
  /// **'Contacts'**
  String get clientContacts;

  /// No description provided for @clientContactsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No contacts recorded for this client.'**
  String get clientContactsEmpty;

  /// No description provided for @clientDecisionMaker.
  ///
  /// In en, this message translates to:
  /// **'Decision maker'**
  String get clientDecisionMaker;

  /// No description provided for @clientEmailContact.
  ///
  /// In en, this message translates to:
  /// **'Email {name}'**
  String clientEmailContact(String name);

  /// No description provided for @clientCallContact.
  ///
  /// In en, this message translates to:
  /// **'Call {name}'**
  String clientCallContact(String name);

  /// No description provided for @clientTabOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get clientTabOverview;

  /// No description provided for @clientTabManage.
  ///
  /// In en, this message translates to:
  /// **'Manage'**
  String get clientTabManage;

  /// No description provided for @clientTabBrand.
  ///
  /// In en, this message translates to:
  /// **'Brand kit'**
  String get clientTabBrand;

  /// No description provided for @clientTabProjects.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get clientTabProjects;

  /// No description provided for @clientManageTitle.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get clientManageTitle;

  /// No description provided for @clientManageBody.
  ///
  /// In en, this message translates to:
  /// **'Jump into every area for this client.'**
  String get clientManageBody;

  /// No description provided for @clientManageContent.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get clientManageContent;

  /// No description provided for @clientManageContentBody.
  ///
  /// In en, this message translates to:
  /// **'Posts, captions and planner'**
  String get clientManageContentBody;

  /// No description provided for @clientManageCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get clientManageCalendar;

  /// No description provided for @clientManageCalendarBody.
  ///
  /// In en, this message translates to:
  /// **'Schedule and deadlines'**
  String get clientManageCalendarBody;

  /// No description provided for @clientManageMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get clientManageMessages;

  /// No description provided for @clientManageMessagesBody.
  ///
  /// In en, this message translates to:
  /// **'Feedback and conversations'**
  String get clientManageMessagesBody;

  /// No description provided for @clientManageAssets.
  ///
  /// In en, this message translates to:
  /// **'Assets'**
  String get clientManageAssets;

  /// No description provided for @clientManageAssetsBody.
  ///
  /// In en, this message translates to:
  /// **'Files and brand media'**
  String get clientManageAssetsBody;

  /// No description provided for @clientManageInvoices.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get clientManageInvoices;

  /// No description provided for @clientManageInvoicesBody.
  ///
  /// In en, this message translates to:
  /// **'Billing and retainers'**
  String get clientManageInvoicesBody;

  /// No description provided for @clientManageIntegrations.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get clientManageIntegrations;

  /// No description provided for @clientManageIntegrationsBody.
  ///
  /// In en, this message translates to:
  /// **'Connected accounts'**
  String get clientManageIntegrationsBody;

  /// No description provided for @clientManageCompose.
  ///
  /// In en, this message translates to:
  /// **'New post'**
  String get clientManageCompose;

  /// No description provided for @clientManageAgreements.
  ///
  /// In en, this message translates to:
  /// **'Agreements'**
  String get clientManageAgreements;

  /// No description provided for @clientManageAgreementsBody.
  ///
  /// In en, this message translates to:
  /// **'Contracts, NDAs and signatures'**
  String get clientManageAgreementsBody;

  /// No description provided for @clientManageGrid.
  ///
  /// In en, this message translates to:
  /// **'Content grid'**
  String get clientManageGrid;

  /// No description provided for @clientManageGridBody.
  ///
  /// In en, this message translates to:
  /// **'Instagram-style feed planner'**
  String get clientManageGridBody;

  /// No description provided for @clientTabAgreements.
  ///
  /// In en, this message translates to:
  /// **'Agreements'**
  String get clientTabAgreements;

  /// No description provided for @agreementsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No agreements yet'**
  String get agreementsEmptyTitle;

  /// No description provided for @agreementsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create an NDA, MSA or SOW and upload the signed PDF when ready.'**
  String get agreementsEmptyBody;

  /// No description provided for @agreementsNew.
  ///
  /// In en, this message translates to:
  /// **'New agreement'**
  String get agreementsNew;

  /// No description provided for @agreementsNewHint.
  ///
  /// In en, this message translates to:
  /// **'Start a draft contract for this client. You can upload a PDF and collect a signature next.'**
  String get agreementsNewHint;

  /// No description provided for @agreementsTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get agreementsTitleLabel;

  /// No description provided for @agreementsTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get agreementsTypeLabel;

  /// No description provided for @agreementsTypeNda.
  ///
  /// In en, this message translates to:
  /// **'NDA'**
  String get agreementsTypeNda;

  /// No description provided for @agreementsTypeMsa.
  ///
  /// In en, this message translates to:
  /// **'MSA'**
  String get agreementsTypeMsa;

  /// No description provided for @agreementsTypeSow.
  ///
  /// In en, this message translates to:
  /// **'SOW'**
  String get agreementsTypeSow;

  /// No description provided for @agreementsTypeOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get agreementsTypeOther;

  /// No description provided for @agreementsStart.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get agreementsStart;

  /// No description provided for @agreementsEnd.
  ///
  /// In en, this message translates to:
  /// **'End date'**
  String get agreementsEnd;

  /// No description provided for @agreementsStatTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get agreementsStatTotal;

  /// No description provided for @agreementsStatSigned.
  ///
  /// In en, this message translates to:
  /// **'Signed'**
  String get agreementsStatSigned;

  /// No description provided for @agreementsStatDraft.
  ///
  /// In en, this message translates to:
  /// **'Drafts'**
  String get agreementsStatDraft;

  /// No description provided for @agreementsDownload.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get agreementsDownload;

  /// No description provided for @agreementsDownloadStarted.
  ///
  /// In en, this message translates to:
  /// **'Opening agreement…'**
  String get agreementsDownloadStarted;

  /// No description provided for @agreementsUploadPdf.
  ///
  /// In en, this message translates to:
  /// **'Upload PDF'**
  String get agreementsUploadPdf;

  /// No description provided for @agreementsPdfUploaded.
  ///
  /// In en, this message translates to:
  /// **'PDF uploaded'**
  String get agreementsPdfUploaded;

  /// No description provided for @agreementsSign.
  ///
  /// In en, this message translates to:
  /// **'Sign'**
  String get agreementsSign;

  /// No description provided for @agreementsSignTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign agreement'**
  String get agreementsSignTitle;

  /// No description provided for @agreementsSignHint.
  ///
  /// In en, this message translates to:
  /// **'Type your full legal name to sign. A snapshot of the PDF is locked at signing time.'**
  String get agreementsSignHint;

  /// No description provided for @agreementsSignerName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get agreementsSignerName;

  /// No description provided for @agreementsMarkSigned.
  ///
  /// In en, this message translates to:
  /// **'Mark signed'**
  String get agreementsMarkSigned;

  /// No description provided for @agreementsSignedToast.
  ///
  /// In en, this message translates to:
  /// **'Agreement signed'**
  String get agreementsSignedToast;

  /// No description provided for @agreementsCreatedToast.
  ///
  /// In en, this message translates to:
  /// **'Agreement created'**
  String get agreementsCreatedToast;

  /// No description provided for @agreementsStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get agreementsStatusDraft;

  /// No description provided for @agreementsStatusSent.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get agreementsStatusSent;

  /// No description provided for @agreementsStatusSigned.
  ///
  /// In en, this message translates to:
  /// **'Signed'**
  String get agreementsStatusSigned;

  /// No description provided for @agreementsStatusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get agreementsStatusActive;

  /// No description provided for @agreementsStatusExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get agreementsStatusExpired;

  /// No description provided for @agreementsStatusVoid.
  ///
  /// In en, this message translates to:
  /// **'Void'**
  String get agreementsStatusVoid;

  /// No description provided for @clientProjectsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No projects for this client yet.'**
  String get clientProjectsEmpty;

  /// No description provided for @clientBrandColours.
  ///
  /// In en, this message translates to:
  /// **'Colours'**
  String get clientBrandColours;

  /// No description provided for @clientBrandEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit brand kit'**
  String get clientBrandEdit;

  /// No description provided for @clientBrandPrimary.
  ///
  /// In en, this message translates to:
  /// **'Primary'**
  String get clientBrandPrimary;

  /// No description provided for @clientBrandSecondary.
  ///
  /// In en, this message translates to:
  /// **'Secondary'**
  String get clientBrandSecondary;

  /// No description provided for @clientBrandAccent.
  ///
  /// In en, this message translates to:
  /// **'Accent'**
  String get clientBrandAccent;

  /// No description provided for @clientBrandVoice.
  ///
  /// In en, this message translates to:
  /// **'Voice & tone'**
  String get clientBrandVoice;

  /// No description provided for @clientBrandVoiceEmpty.
  ///
  /// In en, this message translates to:
  /// **'No voice guidelines yet.'**
  String get clientBrandVoiceEmpty;

  /// No description provided for @clientBrandPillars.
  ///
  /// In en, this message translates to:
  /// **'Content pillars'**
  String get clientBrandPillars;

  /// No description provided for @clientBrandHashtags.
  ///
  /// In en, this message translates to:
  /// **'Hashtags'**
  String get clientBrandHashtags;

  /// No description provided for @clientBrandNone.
  ///
  /// In en, this message translates to:
  /// **'None added yet.'**
  String get clientBrandNone;

  /// No description provided for @clientStatAll.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get clientStatAll;

  /// No description provided for @clientStatActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get clientStatActive;

  /// No description provided for @clientStatOnboarding.
  ///
  /// In en, this message translates to:
  /// **'Onboarding'**
  String get clientStatOnboarding;

  /// No description provided for @clientStatPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get clientStatPaused;

  /// No description provided for @navContent.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get navContent;

  /// No description provided for @contentTitle.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get contentTitle;

  /// No description provided for @contentNew.
  ///
  /// In en, this message translates to:
  /// **'New post'**
  String get contentNew;

  /// No description provided for @contentEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit post'**
  String get contentEditTitle;

  /// No description provided for @contentTabLibrary.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get contentTabLibrary;

  /// No description provided for @contentTabPlanner.
  ///
  /// In en, this message translates to:
  /// **'Planner'**
  String get contentTabPlanner;

  /// No description provided for @contentSearch.
  ///
  /// In en, this message translates to:
  /// **'Search title, caption or hashtags'**
  String get contentSearch;

  /// No description provided for @contentEmpty.
  ///
  /// In en, this message translates to:
  /// **'No content yet'**
  String get contentEmpty;

  /// No description provided for @contentEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Draft posts for your clients, send them for review and plan the feed.'**
  String get contentEmptyBody;

  /// No description provided for @contentUntitled.
  ///
  /// In en, this message translates to:
  /// **'Untitled post'**
  String get contentUntitled;

  /// No description provided for @contentStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} IN_REVIEW{In review} CHANGES_REQUESTED{Changes requested} APPROVED{Approved} SCHEDULED{Scheduled} PUBLISHED{Published} other{{status}}}'**
  String contentStatus(String status);

  /// No description provided for @contentType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, POST{Post} CAROUSEL{Carousel} REEL{Reel} STORY{Story} VIDEO{Video} ARTICLE{Article} other{{type}}}'**
  String contentType(String type);

  /// No description provided for @contentPlatform.
  ///
  /// In en, this message translates to:
  /// **'{platform, select, instagram{Instagram} facebook{Facebook} linkedin{LinkedIn} x{X} youtube{YouTube} tiktok{TikTok} other{{platform}}}'**
  String contentPlatform(String platform);

  /// No description provided for @contentPlatformNotConnected.
  ///
  /// In en, this message translates to:
  /// **'{platform} · not connected'**
  String contentPlatformNotConnected(String platform);

  /// No description provided for @contentFilterMine.
  ///
  /// In en, this message translates to:
  /// **'Mine'**
  String get contentFilterMine;

  /// No description provided for @contentFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get contentFilterClient;

  /// No description provided for @contentFilterType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get contentFilterType;

  /// No description provided for @contentFilterPlatform.
  ///
  /// In en, this message translates to:
  /// **'Platform'**
  String get contentFilterPlatform;

  /// No description provided for @contentScheduledFor.
  ///
  /// In en, this message translates to:
  /// **'Scheduled {date}'**
  String contentScheduledFor(String date);

  /// No description provided for @contentUnscheduled.
  ///
  /// In en, this message translates to:
  /// **'Not scheduled'**
  String get contentUnscheduled;

  /// No description provided for @contentUpdatedAgo.
  ///
  /// In en, this message translates to:
  /// **'Updated {time}'**
  String contentUpdatedAgo(String time);

  /// No description provided for @contentSlidePosition.
  ///
  /// In en, this message translates to:
  /// **'Slide {current} of {total}'**
  String contentSlidePosition(int current, int total);

  /// No description provided for @contentSlidePrevious.
  ///
  /// In en, this message translates to:
  /// **'Previous slide'**
  String get contentSlidePrevious;

  /// No description provided for @contentSlideNext.
  ///
  /// In en, this message translates to:
  /// **'Next slide'**
  String get contentSlideNext;

  /// No description provided for @contentPlannerPosts.
  ///
  /// In en, this message translates to:
  /// **'Posts'**
  String get contentPlannerPosts;

  /// No description provided for @contentPlannerPlanned.
  ///
  /// In en, this message translates to:
  /// **'Planned'**
  String get contentPlannerPlanned;

  /// No description provided for @contentPlannerLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get contentPlannerLive;

  /// No description provided for @contentPlannerFeed.
  ///
  /// In en, this message translates to:
  /// **'Feed'**
  String get contentPlannerFeed;

  /// No description provided for @contentPlannerSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving order…'**
  String get contentPlannerSaving;

  /// No description provided for @contentPlannerSaved.
  ///
  /// In en, this message translates to:
  /// **'Feed order saved'**
  String get contentPlannerSaved;

  /// No description provided for @contentPlannerHint.
  ///
  /// In en, this message translates to:
  /// **'Long-press and drag a tile to rearrange the feed'**
  String get contentPlannerHint;

  /// No description provided for @contentPlannerEmpty.
  ///
  /// In en, this message translates to:
  /// **'Pick a client to plan their feed'**
  String get contentPlannerEmpty;

  /// No description provided for @contentPlannerEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'The planner shows a client’s posts as they will appear on their profile grid.'**
  String get contentPlannerEmptyBody;

  /// No description provided for @contentPlannerMoveEarlier.
  ///
  /// In en, this message translates to:
  /// **'Move earlier'**
  String get contentPlannerMoveEarlier;

  /// No description provided for @contentPlannerMoveLater.
  ///
  /// In en, this message translates to:
  /// **'Move later'**
  String get contentPlannerMoveLater;

  /// No description provided for @contentPlannerTile.
  ///
  /// In en, this message translates to:
  /// **'{title}, {status}, position {position}'**
  String contentPlannerTile(String title, String status, int position);

  /// No description provided for @contentWorkflowTitle.
  ///
  /// In en, this message translates to:
  /// **'Workflow'**
  String get contentWorkflowTitle;

  /// No description provided for @contentWorkflowHint.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Finish the post, then submit it for review.} IN_REVIEW{Waiting for a reviewer to approve or request changes.} CHANGES_REQUESTED{The reviewer asked for changes. Edit the post and resubmit it.} APPROVED{Approved. Schedule it or publish it now.} SCHEDULED{Scheduled to go out at the planned time.} PUBLISHED{Published. This post can no longer be changed.} other{{status}}}'**
  String contentWorkflowHint(String status);

  /// No description provided for @contentPipelineSemantics.
  ///
  /// In en, this message translates to:
  /// **'Workflow: {status}, step {step} of {total}'**
  String contentPipelineSemantics(String status, int step, int total);

  /// No description provided for @contentWaitingForReview.
  ///
  /// In en, this message translates to:
  /// **'Waiting for someone with approval rights to review it.'**
  String get contentWaitingForReview;

  /// No description provided for @contentActionApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get contentActionApprove;

  /// No description provided for @contentActionRequestChanges.
  ///
  /// In en, this message translates to:
  /// **'Request changes'**
  String get contentActionRequestChanges;

  /// No description provided for @contentActionReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get contentActionReject;

  /// No description provided for @contentActionSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit for review'**
  String get contentActionSubmit;

  /// No description provided for @contentActionWithdraw.
  ///
  /// In en, this message translates to:
  /// **'Withdraw from review'**
  String get contentActionWithdraw;

  /// No description provided for @contentActionSchedule.
  ///
  /// In en, this message translates to:
  /// **'Schedule'**
  String get contentActionSchedule;

  /// No description provided for @contentActionUnschedule.
  ///
  /// In en, this message translates to:
  /// **'Unschedule'**
  String get contentActionUnschedule;

  /// No description provided for @contentActionPublish.
  ///
  /// In en, this message translates to:
  /// **'Mark as published'**
  String get contentActionPublish;

  /// No description provided for @contentActionBackToDraft.
  ///
  /// In en, this message translates to:
  /// **'Back to draft'**
  String get contentActionBackToDraft;

  /// No description provided for @contentMovedToast.
  ///
  /// In en, this message translates to:
  /// **'Moved to {status}'**
  String contentMovedToast(String status);

  /// No description provided for @contentApprovedToast.
  ///
  /// In en, this message translates to:
  /// **'Post approved'**
  String get contentApprovedToast;

  /// No description provided for @contentSubmittedToast.
  ///
  /// In en, this message translates to:
  /// **'Sent for review'**
  String get contentSubmittedToast;

  /// No description provided for @contentPublishConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Mark as published?'**
  String get contentPublishConfirmTitle;

  /// No description provided for @contentPublishConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Published posts are locked and can no longer be edited.'**
  String get contentPublishConfirmBody;

  /// No description provided for @contentScheduleTitle.
  ///
  /// In en, this message translates to:
  /// **'Schedule post'**
  String get contentScheduleTitle;

  /// No description provided for @contentRescheduleTitle.
  ///
  /// In en, this message translates to:
  /// **'Change publish date'**
  String get contentRescheduleTitle;

  /// No description provided for @contentScheduleBody.
  ///
  /// In en, this message translates to:
  /// **'Choose when this post should go out.'**
  String get contentScheduleBody;

  /// No description provided for @contentReviewChangesTitle.
  ///
  /// In en, this message translates to:
  /// **'Request changes to “{title}”'**
  String contentReviewChangesTitle(String title);

  /// No description provided for @contentReviewRejectTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject “{title}”'**
  String contentReviewRejectTitle(String title);

  /// No description provided for @contentReviewChangesBody.
  ///
  /// In en, this message translates to:
  /// **'The post goes back to its author with your note.'**
  String get contentReviewChangesBody;

  /// No description provided for @contentReviewRejectBody.
  ///
  /// In en, this message translates to:
  /// **'The post goes back to draft. Tell the author why.'**
  String get contentReviewRejectBody;

  /// No description provided for @contentReviewNote.
  ///
  /// In en, this message translates to:
  /// **'Note for the author'**
  String get contentReviewNote;

  /// No description provided for @contentReviewNoteHint.
  ///
  /// In en, this message translates to:
  /// **'What should change?'**
  String get contentReviewNoteHint;

  /// No description provided for @contentPreviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get contentPreviewTitle;

  /// No description provided for @contentPreviewEmpty.
  ///
  /// In en, this message translates to:
  /// **'The caption will appear here.'**
  String get contentPreviewEmpty;

  /// No description provided for @contentPreviewSemantics.
  ///
  /// In en, this message translates to:
  /// **'Post preview for {platform}'**
  String contentPreviewSemantics(String platform);

  /// No description provided for @contentPreviewTruncated.
  ///
  /// In en, this message translates to:
  /// **'{platform} shows the first {limit} characters; the rest is cut off.'**
  String contentPreviewTruncated(String platform, int limit);

  /// No description provided for @contentPublishedReadOnly.
  ///
  /// In en, this message translates to:
  /// **'Published posts are read-only.'**
  String get contentPublishedReadOnly;

  /// No description provided for @contentNotEditable.
  ///
  /// In en, this message translates to:
  /// **'This post can’t be edited'**
  String get contentNotEditable;

  /// No description provided for @contentLinkFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t open the link'**
  String get contentLinkFailed;

  /// No description provided for @contentCommentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Comments'**
  String get contentCommentsTitle;

  /// No description provided for @contentCommentsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Comments} =1{1 comment} other{{count} comments}}'**
  String contentCommentsCount(int count);

  /// No description provided for @contentCommentsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No comments yet. Start the conversation.'**
  String get contentCommentsEmpty;

  /// No description provided for @contentCommentYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get contentCommentYou;

  /// No description provided for @contentCommentTeammate.
  ///
  /// In en, this message translates to:
  /// **'Teammate'**
  String get contentCommentTeammate;

  /// No description provided for @contentCommentLabel.
  ///
  /// In en, this message translates to:
  /// **'Add a comment'**
  String get contentCommentLabel;

  /// No description provided for @contentCommentHint.
  ///
  /// In en, this message translates to:
  /// **'Share feedback on this post'**
  String get contentCommentHint;

  /// No description provided for @contentCommentSend.
  ///
  /// In en, this message translates to:
  /// **'Send comment'**
  String get contentCommentSend;

  /// No description provided for @contentCommentSent.
  ///
  /// In en, this message translates to:
  /// **'Comment added'**
  String get contentCommentSent;

  /// No description provided for @contentSectionBasics.
  ///
  /// In en, this message translates to:
  /// **'Basics'**
  String get contentSectionBasics;

  /// No description provided for @contentSectionMedia.
  ///
  /// In en, this message translates to:
  /// **'Media'**
  String get contentSectionMedia;

  /// No description provided for @contentSectionCopy.
  ///
  /// In en, this message translates to:
  /// **'Caption & hashtags'**
  String get contentSectionCopy;

  /// No description provided for @contentSectionPublishing.
  ///
  /// In en, this message translates to:
  /// **'Publishing'**
  String get contentSectionPublishing;

  /// No description provided for @contentFieldClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get contentFieldClient;

  /// No description provided for @contentFieldAuthor.
  ///
  /// In en, this message translates to:
  /// **'Author'**
  String get contentFieldAuthor;

  /// No description provided for @contentFieldTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get contentFieldTitle;

  /// No description provided for @contentFieldTitleHint.
  ///
  /// In en, this message translates to:
  /// **'Internal name, e.g. Spring launch teaser'**
  String get contentFieldTitleHint;

  /// No description provided for @contentFieldType.
  ///
  /// In en, this message translates to:
  /// **'Format'**
  String get contentFieldType;

  /// No description provided for @contentFieldPlatforms.
  ///
  /// In en, this message translates to:
  /// **'Platforms'**
  String get contentFieldPlatforms;

  /// No description provided for @contentFieldCaption.
  ///
  /// In en, this message translates to:
  /// **'Caption'**
  String get contentFieldCaption;

  /// No description provided for @contentFieldCaptionHint.
  ///
  /// In en, this message translates to:
  /// **'Write the post copy'**
  String get contentFieldCaptionHint;

  /// No description provided for @contentFieldHashtags.
  ///
  /// In en, this message translates to:
  /// **'Hashtags'**
  String get contentFieldHashtags;

  /// No description provided for @contentFieldPillar.
  ///
  /// In en, this message translates to:
  /// **'Content pillar'**
  String get contentFieldPillar;

  /// No description provided for @contentFieldPillarHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Education, Behind the scenes'**
  String get contentFieldPillarHint;

  /// No description provided for @contentFieldCta.
  ///
  /// In en, this message translates to:
  /// **'Call-to-action link'**
  String get contentFieldCta;

  /// No description provided for @contentFieldCtaHint.
  ///
  /// In en, this message translates to:
  /// **'https://'**
  String get contentFieldCtaHint;

  /// No description provided for @contentFieldScheduledAt.
  ///
  /// In en, this message translates to:
  /// **'Publish date'**
  String get contentFieldScheduledAt;

  /// No description provided for @contentFieldUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get contentFieldUpdated;

  /// No description provided for @contentNoClients.
  ///
  /// In en, this message translates to:
  /// **'You need access to at least one client to create content.'**
  String get contentNoClients;

  /// No description provided for @contentEditResetsApproval.
  ///
  /// In en, this message translates to:
  /// **'Saving changes sends this post back to draft so it can be reviewed again.'**
  String get contentEditResetsApproval;

  /// No description provided for @contentOpenApproval.
  ///
  /// In en, this message translates to:
  /// **'Open approval request'**
  String get contentOpenApproval;

  /// No description provided for @contentOpenApprovalBody.
  ///
  /// In en, this message translates to:
  /// **'A formal approval is waiting for a decision on this post.'**
  String get contentOpenApprovalBody;

  /// No description provided for @contentCtaInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a full link starting with http:// or https://'**
  String get contentCtaInvalid;

  /// No description provided for @contentCaptionCounter.
  ///
  /// In en, this message translates to:
  /// **'{count} / {limit} characters'**
  String contentCaptionCounter(int count, int limit);

  /// No description provided for @contentCaptionOver.
  ///
  /// In en, this message translates to:
  /// **'{count} / {limit} characters · too long for the selected platforms'**
  String contentCaptionOver(int count, int limit);

  /// No description provided for @contentHashtagsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} of {max} hashtags'**
  String contentHashtagsCount(int count, int max);

  /// No description provided for @contentHashtagsFull.
  ///
  /// In en, this message translates to:
  /// **'You can add up to {max} hashtags'**
  String contentHashtagsFull(int max);

  /// No description provided for @contentHashtagsAdded.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No new hashtags} =1{Added 1 hashtag} other{Added {count} hashtags}}'**
  String contentHashtagsAdded(int count);

  /// No description provided for @contentBrandVoice.
  ///
  /// In en, this message translates to:
  /// **'Brand voice: {voice}'**
  String contentBrandVoice(String voice);

  /// No description provided for @contentBrandHashtags.
  ///
  /// In en, this message translates to:
  /// **'Brand hashtags'**
  String get contentBrandHashtags;

  /// No description provided for @contentBrandPillars.
  ///
  /// In en, this message translates to:
  /// **'Brand pillars'**
  String get contentBrandPillars;

  /// No description provided for @contentAiWriteCaption.
  ///
  /// In en, this message translates to:
  /// **'Write caption'**
  String get contentAiWriteCaption;

  /// No description provided for @contentAiSuggestHashtags.
  ///
  /// In en, this message translates to:
  /// **'Suggest hashtags'**
  String get contentAiSuggestHashtags;

  /// No description provided for @contentAiNeedsTopic.
  ///
  /// In en, this message translates to:
  /// **'Add a title or a few words first so AI knows what to write about'**
  String get contentAiNeedsTopic;

  /// No description provided for @contentAiCaptionDone.
  ///
  /// In en, this message translates to:
  /// **'Caption drafted'**
  String get contentAiCaptionDone;

  /// No description provided for @contentUndo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get contentUndo;

  /// No description provided for @contentStatMedia.
  ///
  /// In en, this message translates to:
  /// **'Media'**
  String get contentStatMedia;

  /// No description provided for @contentMediaAdd.
  ///
  /// In en, this message translates to:
  /// **'Add from library'**
  String get contentMediaAdd;

  /// No description provided for @contentMediaEmpty.
  ///
  /// In en, this message translates to:
  /// **'No media yet. Add images or videos from the client’s library.'**
  String get contentMediaEmpty;

  /// No description provided for @contentMediaCount.
  ///
  /// In en, this message translates to:
  /// **'{count} of {max} files'**
  String contentMediaCount(int count, int max);

  /// No description provided for @contentMediaItem.
  ///
  /// In en, this message translates to:
  /// **'Slide {position} of {total}: {name}'**
  String contentMediaItem(int position, int total, String name);

  /// No description provided for @contentMediaMoveEarlier.
  ///
  /// In en, this message translates to:
  /// **'Move earlier'**
  String get contentMediaMoveEarlier;

  /// No description provided for @contentMediaMoveLater.
  ///
  /// In en, this message translates to:
  /// **'Move later'**
  String get contentMediaMoveLater;

  /// No description provided for @contentMediaReorderHint.
  ///
  /// In en, this message translates to:
  /// **'Long-press and drag to reorder slides'**
  String get contentMediaReorderHint;

  /// No description provided for @contentMediaPickClientFirst.
  ///
  /// In en, this message translates to:
  /// **'Choose a client first'**
  String get contentMediaPickClientFirst;

  /// No description provided for @contentSaveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save draft'**
  String get contentSaveDraft;

  /// No description provided for @contentSaveAndSubmit.
  ///
  /// In en, this message translates to:
  /// **'Save & submit'**
  String get contentSaveAndSubmit;

  /// No description provided for @contentVersionConflict.
  ///
  /// In en, this message translates to:
  /// **'Someone else changed this post while you were editing. Reload to get the latest version.'**
  String get contentVersionConflict;

  /// No description provided for @contentReloadLatest.
  ///
  /// In en, this message translates to:
  /// **'Reload latest'**
  String get contentReloadLatest;

  /// No description provided for @contentStatAll.
  ///
  /// In en, this message translates to:
  /// **'Posts'**
  String get contentStatAll;

  /// No description provided for @contentStatDraft.
  ///
  /// In en, this message translates to:
  /// **'Drafts'**
  String get contentStatDraft;

  /// No description provided for @contentStatReview.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get contentStatReview;

  /// No description provided for @contentStatScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get contentStatScheduled;

  /// No description provided for @navCustomFields.
  ///
  /// In en, this message translates to:
  /// **'Custom fields'**
  String get navCustomFields;

  /// No description provided for @customFieldsTitle.
  ///
  /// In en, this message translates to:
  /// **'Custom fields'**
  String get customFieldsTitle;

  /// No description provided for @customFieldsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search fields, keys or options'**
  String get customFieldsSearch;

  /// No description provided for @customFieldsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No custom fields yet'**
  String get customFieldsEmpty;

  /// No description provided for @customFieldsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add the extra details your agency tracks on clients, projects, tasks, content and leads.'**
  String get customFieldsEmptyBody;

  /// No description provided for @customFieldNew.
  ///
  /// In en, this message translates to:
  /// **'New field'**
  String get customFieldNew;

  /// No description provided for @customFieldEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit field'**
  String get customFieldEdit;

  /// No description provided for @customFieldEntity.
  ///
  /// In en, this message translates to:
  /// **'{entity, select, client{Clients} project{Projects} task{Tasks} content{Content} lead{Leads} other{{entity}}}'**
  String customFieldEntity(String entity);

  /// No description provided for @customFieldType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, TEXT{Text} NUMBER{Number} DATE{Date} SELECT{Single choice} MULTI_SELECT{Multiple choice} BOOLEAN{Yes / no} URL{Link} other{{type}}}'**
  String customFieldType(String type);

  /// No description provided for @customFieldGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'{entity} · {count}'**
  String customFieldGroupTitle(String entity, int count);

  /// No description provided for @customFieldAddTo.
  ///
  /// In en, this message translates to:
  /// **'Add a field to {entity}'**
  String customFieldAddTo(String entity);

  /// No description provided for @customFieldLabelField.
  ///
  /// In en, this message translates to:
  /// **'Label'**
  String get customFieldLabelField;

  /// No description provided for @customFieldLabelHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Contract end date'**
  String get customFieldLabelHint;

  /// No description provided for @customFieldKeyField.
  ///
  /// In en, this message translates to:
  /// **'Key'**
  String get customFieldKeyField;

  /// No description provided for @customFieldKeyHint.
  ///
  /// In en, this message translates to:
  /// **'Used in exports and integrations. Lowercase letters, numbers and underscores.'**
  String get customFieldKeyHint;

  /// No description provided for @customFieldKeyLocked.
  ///
  /// In en, this message translates to:
  /// **'The key cannot change once the field exists.'**
  String get customFieldKeyLocked;

  /// No description provided for @customFieldKeyInvalid.
  ///
  /// In en, this message translates to:
  /// **'Start with a letter; use lowercase letters, numbers and underscores'**
  String get customFieldKeyInvalid;

  /// No description provided for @customFieldEntityField.
  ///
  /// In en, this message translates to:
  /// **'Applies to'**
  String get customFieldEntityField;

  /// No description provided for @customFieldTypeField.
  ///
  /// In en, this message translates to:
  /// **'Field type'**
  String get customFieldTypeField;

  /// No description provided for @customFieldOptionsField.
  ///
  /// In en, this message translates to:
  /// **'Options'**
  String get customFieldOptionsField;

  /// No description provided for @customFieldOptionsRequired.
  ///
  /// In en, this message translates to:
  /// **'Add at least one option'**
  String get customFieldOptionsRequired;

  /// No description provided for @customFieldRequiredField.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get customFieldRequiredField;

  /// No description provided for @customFieldRequiredHint.
  ///
  /// In en, this message translates to:
  /// **'Records cannot be saved without a value.'**
  String get customFieldRequiredHint;

  /// No description provided for @customFieldFilterableField.
  ///
  /// In en, this message translates to:
  /// **'Filterable'**
  String get customFieldFilterableField;

  /// No description provided for @customFieldFilterableHint.
  ///
  /// In en, this message translates to:
  /// **'Show this field as a filter in lists.'**
  String get customFieldFilterableHint;

  /// No description provided for @customFieldClientVisibleField.
  ///
  /// In en, this message translates to:
  /// **'Visible to clients'**
  String get customFieldClientVisibleField;

  /// No description provided for @customFieldClientVisibleHint.
  ///
  /// In en, this message translates to:
  /// **'Clients see this field in their portal.'**
  String get customFieldClientVisibleHint;

  /// No description provided for @customFieldRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get customFieldRequired;

  /// No description provided for @customFieldFilterable.
  ///
  /// In en, this message translates to:
  /// **'Filterable'**
  String get customFieldFilterable;

  /// No description provided for @customFieldClientVisible.
  ///
  /// In en, this message translates to:
  /// **'Client visible'**
  String get customFieldClientVisible;

  /// No description provided for @customFieldMoreOptions.
  ///
  /// In en, this message translates to:
  /// **'+{count}'**
  String customFieldMoreOptions(int count);

  /// No description provided for @customFieldStatTotal.
  ///
  /// In en, this message translates to:
  /// **'Fields'**
  String get customFieldStatTotal;

  /// No description provided for @customFieldStatRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get customFieldStatRequired;

  /// No description provided for @customFieldStatClientVisible.
  ///
  /// In en, this message translates to:
  /// **'Client visible'**
  String get customFieldStatClientVisible;

  /// No description provided for @dashboardKpiAria.
  ///
  /// In en, this message translates to:
  /// **'Key metrics'**
  String get dashboardKpiAria;

  /// No description provided for @dashboardKpiRetry.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load · tap to retry'**
  String get dashboardKpiRetry;

  /// No description provided for @dashboardKpiMyTasks.
  ///
  /// In en, this message translates to:
  /// **'My open tasks'**
  String get dashboardKpiMyTasks;

  /// No description provided for @dashboardKpiMyTasksCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing due this week} =1{1 due this week} other{{count} due this week}}'**
  String dashboardKpiMyTasksCaption(int count);

  /// No description provided for @dashboardKpiDue.
  ///
  /// In en, this message translates to:
  /// **'Due today & overdue'**
  String get dashboardKpiDue;

  /// No description provided for @dashboardKpiDueCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing overdue} =1{1 overdue} other{{count} overdue}}'**
  String dashboardKpiDueCaption(int count);

  /// No description provided for @dashboardKpiInReview.
  ///
  /// In en, this message translates to:
  /// **'Content in review'**
  String get dashboardKpiInReview;

  /// No description provided for @dashboardKpiInReviewCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No changes requested} =1{1 needs changes} other{{count} need changes}}'**
  String dashboardKpiInReviewCaption(int count);

  /// No description provided for @dashboardKpiApprovals.
  ///
  /// In en, this message translates to:
  /// **'Approvals pending'**
  String get dashboardKpiApprovals;

  /// No description provided for @dashboardKpiApprovalsCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{All on schedule} =1{1 past due} other{{count} past due}}'**
  String dashboardKpiApprovalsCaption(int count);

  /// No description provided for @dashboardKpiOutstanding.
  ///
  /// In en, this message translates to:
  /// **'Outstanding invoices'**
  String get dashboardKpiOutstanding;

  /// No description provided for @dashboardKpiOutstandingCaption.
  ///
  /// In en, this message translates to:
  /// **'{amount} overdue'**
  String dashboardKpiOutstandingCaption(String amount);

  /// No description provided for @dashboardKpiOutstandingClear.
  ///
  /// In en, this message translates to:
  /// **'Nothing overdue'**
  String get dashboardKpiOutstandingClear;

  /// No description provided for @dashboardKpiClients.
  ///
  /// In en, this message translates to:
  /// **'Active clients'**
  String get dashboardKpiClients;

  /// No description provided for @dashboardKpiClientsCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{None onboarding} =1{1 onboarding} other{{count} onboarding}}'**
  String dashboardKpiClientsCaption(int count);

  /// No description provided for @dashboardQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get dashboardQuickActions;

  /// No description provided for @dashboardQuickNewTask.
  ///
  /// In en, this message translates to:
  /// **'New task'**
  String get dashboardQuickNewTask;

  /// No description provided for @dashboardQuickNewPost.
  ///
  /// In en, this message translates to:
  /// **'New post'**
  String get dashboardQuickNewPost;

  /// No description provided for @dashboardQuickNewClient.
  ///
  /// In en, this message translates to:
  /// **'New client'**
  String get dashboardQuickNewClient;

  /// No description provided for @dashboardQuickLogTime.
  ///
  /// In en, this message translates to:
  /// **'Log time'**
  String get dashboardQuickLogTime;

  /// No description provided for @dashboardEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your home is quiet'**
  String get dashboardEmptyTitle;

  /// No description provided for @dashboardEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing is available for your role yet. Ask an admin if you expected to see work here.'**
  String get dashboardEmptyBody;

  /// No description provided for @dashboardMyWorkTitle.
  ///
  /// In en, this message translates to:
  /// **'My work'**
  String get dashboardMyWorkTitle;

  /// No description provided for @dashboardMyWorkEmpty.
  ///
  /// In en, this message translates to:
  /// **'You are all caught up. Nothing assigned to you is open.'**
  String get dashboardMyWorkEmpty;

  /// No description provided for @dashboardApprovalsTitle.
  ///
  /// In en, this message translates to:
  /// **'Awaiting approval'**
  String get dashboardApprovalsTitle;

  /// No description provided for @dashboardApprovalsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for approval.'**
  String get dashboardApprovalsEmpty;

  /// No description provided for @dashboardApprovalSubject.
  ///
  /// In en, this message translates to:
  /// **'{type, select, CONTENT{Content approval} CLIENT{Client approval} other{Approval request}}'**
  String dashboardApprovalSubject(String type);

  /// No description provided for @dashboardRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested {when}'**
  String dashboardRequested(String when);

  /// No description provided for @dashboardUpcomingTitle.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get dashboardUpcomingTitle;

  /// No description provided for @dashboardUpcomingEmpty.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{Nothing scheduled for tomorrow.} other{Nothing scheduled in the next {days} days.}}'**
  String dashboardUpcomingEmpty(int days);

  /// No description provided for @dashboardUpcomingKind.
  ///
  /// In en, this message translates to:
  /// **'{kind, select, CONTENT{Post} TASK{Task} MEETING{Meeting} DEADLINE{Deadline} other{Event}}'**
  String dashboardUpcomingKind(String kind);

  /// No description provided for @dashboardAllDay.
  ///
  /// In en, this message translates to:
  /// **'All day'**
  String get dashboardAllDay;

  /// No description provided for @dashboardPipelineTitle.
  ///
  /// In en, this message translates to:
  /// **'Pipeline snapshot'**
  String get dashboardPipelineTitle;

  /// No description provided for @dashboardPipelineEmpty.
  ///
  /// In en, this message translates to:
  /// **'No open leads yet.'**
  String get dashboardPipelineEmpty;

  /// No description provided for @dashboardPipelineCaption.
  ///
  /// In en, this message translates to:
  /// **'{amount} still to win'**
  String dashboardPipelineCaption(String amount);

  /// No description provided for @dashboardDealCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No deals} =1{1 deal} other{{count} deals}}'**
  String dashboardDealCount(int count);

  /// No description provided for @dashboardRevenueTitle.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get dashboardRevenueTitle;

  /// No description provided for @dashboardRevenueCaption.
  ///
  /// In en, this message translates to:
  /// **'{months, plural, =1{Paid this month} other{Paid in the last {months} months}}'**
  String dashboardRevenueCaption(int months);

  /// No description provided for @dashboardRevenueEmpty.
  ///
  /// In en, this message translates to:
  /// **'{months, plural, =1{No payments this month.} other{No payments in the last {months} months.}}'**
  String dashboardRevenueEmpty(int months);

  /// No description provided for @dashboardRevenueChart.
  ///
  /// In en, this message translates to:
  /// **'Paid per month: {summary}'**
  String dashboardRevenueChart(String summary);

  /// No description provided for @dashboardActivityTitle.
  ///
  /// In en, this message translates to:
  /// **'Recent activity'**
  String get dashboardActivityTitle;

  /// No description provided for @dashboardActivityEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing has happened yet. Actions across the workspace appear here.'**
  String get dashboardActivityEmpty;

  /// No description provided for @dashboardActivitySystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get dashboardActivitySystem;

  /// No description provided for @dashboardActivitySomeone.
  ///
  /// In en, this message translates to:
  /// **'Someone'**
  String get dashboardActivitySomeone;

  /// No description provided for @dashboardTaskStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, TODO{To do} IN_PROGRESS{In progress} IN_REVIEW{In review} DONE{Done} other{{status}}}'**
  String dashboardTaskStatus(String status);

  /// No description provided for @dashboardContentStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} IN_REVIEW{In review} CHANGES_REQUESTED{Changes requested} APPROVED{Approved} SCHEDULED{Scheduled} PUBLISHED{Published} other{{status}}}'**
  String dashboardContentStatus(String status);

  /// No description provided for @dashboardApprovalStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING{Pending} APPROVED{Approved} REJECTED{Rejected} CHANGES_REQUESTED{Changes requested} other{{status}}}'**
  String dashboardApprovalStatus(String status);

  /// No description provided for @dashboardInvoiceStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} SENT{Sent} PAID{Paid} OVERDUE{Overdue} VOID{Void} other{{status}}}'**
  String dashboardInvoiceStatus(String status);

  /// No description provided for @dashboardReportStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} READY{Ready} SENT{Sent} other{{status}}}'**
  String dashboardReportStatus(String status);

  /// No description provided for @dashboardClientStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, ONBOARDING{Onboarding} ACTIVE{Active} PAUSED{Paused} CHURNED{Churned} other{{status}}}'**
  String dashboardClientStatus(String status);

  /// No description provided for @dashboardProjectStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PLANNING{Planning} ACTIVE{Active} ON_HOLD{On hold} COMPLETED{Completed} CANCELLED{Cancelled} other{{status}}}'**
  String dashboardProjectStatus(String status);

  /// No description provided for @dashboardLeadStage.
  ///
  /// In en, this message translates to:
  /// **'{stage, select, NEW{New} CONTACTED{Contacted} PROPOSAL{Proposal} NEGOTIATION{Negotiation} WON{Won} LOST{Lost} other{{stage}}}'**
  String dashboardLeadStage(String stage);

  /// No description provided for @navDepartments.
  ///
  /// In en, this message translates to:
  /// **'Departments'**
  String get navDepartments;

  /// No description provided for @departmentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Departments'**
  String get departmentsTitle;

  /// No description provided for @departmentsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search departments'**
  String get departmentsSearch;

  /// No description provided for @departmentsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No departments yet'**
  String get departmentsEmpty;

  /// No description provided for @departmentsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Group your agency into departments like Creative or Accounts to organise access and reporting.'**
  String get departmentsEmptyBody;

  /// No description provided for @departmentNew.
  ///
  /// In en, this message translates to:
  /// **'New department'**
  String get departmentNew;

  /// No description provided for @departmentAddSub.
  ///
  /// In en, this message translates to:
  /// **'Add sub-department'**
  String get departmentAddSub;

  /// No description provided for @departmentName.
  ///
  /// In en, this message translates to:
  /// **'Department name'**
  String get departmentName;

  /// No description provided for @departmentNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Creative'**
  String get departmentNameHint;

  /// No description provided for @departmentParent.
  ///
  /// In en, this message translates to:
  /// **'Parent department'**
  String get departmentParent;

  /// No description provided for @departmentParentNone.
  ///
  /// In en, this message translates to:
  /// **'This department will sit at the top level.'**
  String get departmentParentNone;

  /// No description provided for @departmentParentHint.
  ///
  /// In en, this message translates to:
  /// **'It will sit under {path}.'**
  String departmentParentHint(String path);

  /// No description provided for @departmentPositions.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No positions} =1{1 position} other{{count} positions}}'**
  String departmentPositions(int count);

  /// No description provided for @departmentPositionsLabel.
  ///
  /// In en, this message translates to:
  /// **'Positions'**
  String get departmentPositionsLabel;

  /// No description provided for @departmentPositionsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No positions defined in this department yet.'**
  String get departmentPositionsEmpty;

  /// No description provided for @departmentSubCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 sub-department} other{{count} sub-departments}}'**
  String departmentSubCount(int count);

  /// No description provided for @departmentSubDepartments.
  ///
  /// In en, this message translates to:
  /// **'Sub-departments'**
  String get departmentSubDepartments;

  /// No description provided for @departmentTopLevel.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 top level} other{{count} top level}}'**
  String departmentTopLevel(int count);

  /// No description provided for @departmentCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get departmentCreated;

  /// No description provided for @departmentExpand.
  ///
  /// In en, this message translates to:
  /// **'Expand'**
  String get departmentExpand;

  /// No description provided for @departmentCollapse.
  ///
  /// In en, this message translates to:
  /// **'Collapse'**
  String get departmentCollapse;

  /// No description provided for @departmentExpandAll.
  ///
  /// In en, this message translates to:
  /// **'Expand all'**
  String get departmentExpandAll;

  /// No description provided for @departmentCollapseAll.
  ///
  /// In en, this message translates to:
  /// **'Collapse all'**
  String get departmentCollapseAll;

  /// No description provided for @departmentTeamNew.
  ///
  /// In en, this message translates to:
  /// **'New team'**
  String get departmentTeamNew;

  /// No description provided for @departmentTeamBody.
  ///
  /// In en, this message translates to:
  /// **'Teams group people who work together across departments, such as a client pod.'**
  String get departmentTeamBody;

  /// No description provided for @departmentTeamName.
  ///
  /// In en, this message translates to:
  /// **'Team name'**
  String get departmentTeamName;

  /// No description provided for @departmentTeamNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Retail pod'**
  String get departmentTeamNameHint;

  /// No description provided for @departmentTeamDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get departmentTeamDescription;

  /// No description provided for @departmentTeamCreated.
  ///
  /// In en, this message translates to:
  /// **'Team created'**
  String get departmentTeamCreated;

  /// No description provided for @navInbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get navInbox;

  /// No description provided for @inboxTitle.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get inboxTitle;

  /// No description provided for @inboxSearch.
  ///
  /// In en, this message translates to:
  /// **'Search author or message'**
  String get inboxSearch;

  /// No description provided for @inboxEmpty.
  ///
  /// In en, this message translates to:
  /// **'Inbox zero'**
  String get inboxEmpty;

  /// No description provided for @inboxEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Comments, DMs and mentions from your clients\' channels will land here.'**
  String get inboxEmptyBody;

  /// No description provided for @inboxStatOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get inboxStatOpen;

  /// No description provided for @inboxStatOpenHint.
  ///
  /// In en, this message translates to:
  /// **'Needs a reply'**
  String get inboxStatOpenHint;

  /// No description provided for @inboxStatUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get inboxStatUrgent;

  /// No description provided for @inboxStatUrgentHint.
  ///
  /// In en, this message translates to:
  /// **'High or urgent priority'**
  String get inboxStatUrgentHint;

  /// No description provided for @inboxStatMine.
  ///
  /// In en, this message translates to:
  /// **'Mine'**
  String get inboxStatMine;

  /// No description provided for @inboxStatMineHint.
  ///
  /// In en, this message translates to:
  /// **'Assigned to you'**
  String get inboxStatMineHint;

  /// No description provided for @inboxStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, OPEN{Open} REPLIED{Replied} ARCHIVED{Archived} other{{status}}}'**
  String inboxStatus(String status);

  /// No description provided for @inboxType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, COMMENT{Comment} DM{Direct message} MENTION{Mention} other{{type}}}'**
  String inboxType(String type);

  /// No description provided for @inboxSentiment.
  ///
  /// In en, this message translates to:
  /// **'{sentiment, select, POSITIVE{Positive} NEUTRAL{Neutral} NEGATIVE{Negative} other{Not rated}}'**
  String inboxSentiment(String sentiment);

  /// No description provided for @inboxPriority.
  ///
  /// In en, this message translates to:
  /// **'{priority, select, LOW{Low} NORMAL{Normal} HIGH{High} URGENT{Urgent} other{{priority}}}'**
  String inboxPriority(String priority);

  /// No description provided for @inboxPlatform.
  ///
  /// In en, this message translates to:
  /// **'{platform, select, instagram{Instagram} facebook{Facebook} linkedin{LinkedIn} x{X} youtube{YouTube} tiktok{TikTok} other{{platform}}}'**
  String inboxPlatform(String platform);

  /// No description provided for @inboxFilterType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get inboxFilterType;

  /// No description provided for @inboxFilterSentiment.
  ///
  /// In en, this message translates to:
  /// **'Sentiment'**
  String get inboxFilterSentiment;

  /// No description provided for @inboxFilterPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get inboxFilterPriority;

  /// No description provided for @inboxFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get inboxFilterClient;

  /// No description provided for @inboxFilterMine.
  ///
  /// In en, this message translates to:
  /// **'Assigned to me'**
  String get inboxFilterMine;

  /// No description provided for @inboxClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get inboxClearFilters;

  /// No description provided for @inboxUnknownAuthor.
  ///
  /// In en, this message translates to:
  /// **'Unknown author'**
  String get inboxUnknownAuthor;

  /// No description provided for @inboxNoPreview.
  ///
  /// In en, this message translates to:
  /// **'No message text'**
  String get inboxNoPreview;

  /// No description provided for @inboxSelectTitle.
  ///
  /// In en, this message translates to:
  /// **'Select a conversation'**
  String get inboxSelectTitle;

  /// No description provided for @inboxSelectBody.
  ///
  /// In en, this message translates to:
  /// **'Pick a message to read the thread, triage it and reply.'**
  String get inboxSelectBody;

  /// No description provided for @inboxMetaClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get inboxMetaClient;

  /// No description provided for @inboxMetaReceived.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get inboxMetaReceived;

  /// No description provided for @inboxMetaSentiment.
  ///
  /// In en, this message translates to:
  /// **'Sentiment'**
  String get inboxMetaSentiment;

  /// No description provided for @inboxMetaPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get inboxMetaPriority;

  /// No description provided for @inboxMetaAssignee.
  ///
  /// In en, this message translates to:
  /// **'Assignee'**
  String get inboxMetaAssignee;

  /// No description provided for @inboxPriorityValue.
  ///
  /// In en, this message translates to:
  /// **'Priority: {priority}'**
  String inboxPriorityValue(String priority);

  /// No description provided for @inboxChangeStatus.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get inboxChangeStatus;

  /// No description provided for @inboxChangeSentiment.
  ///
  /// In en, this message translates to:
  /// **'Change sentiment'**
  String get inboxChangeSentiment;

  /// No description provided for @inboxChangePriority.
  ///
  /// In en, this message translates to:
  /// **'Change priority'**
  String get inboxChangePriority;

  /// No description provided for @inboxChangeAssignee.
  ///
  /// In en, this message translates to:
  /// **'Change assignee'**
  String get inboxChangeAssignee;

  /// No description provided for @inboxAssignMe.
  ///
  /// In en, this message translates to:
  /// **'Assign to me'**
  String get inboxAssignMe;

  /// No description provided for @inboxUnassign.
  ///
  /// In en, this message translates to:
  /// **'Unassign'**
  String get inboxUnassign;

  /// No description provided for @inboxArchive.
  ///
  /// In en, this message translates to:
  /// **'Archive'**
  String get inboxArchive;

  /// No description provided for @inboxReopen.
  ///
  /// In en, this message translates to:
  /// **'Reopen'**
  String get inboxReopen;

  /// No description provided for @inboxArchivedToast.
  ///
  /// In en, this message translates to:
  /// **'Conversation archived'**
  String get inboxArchivedToast;

  /// No description provided for @inboxReopenedToast.
  ///
  /// In en, this message translates to:
  /// **'Conversation reopened'**
  String get inboxReopenedToast;

  /// No description provided for @inboxReplyHint.
  ///
  /// In en, this message translates to:
  /// **'Reply to {name}…'**
  String inboxReplyHint(String name);

  /// No description provided for @inboxReplySend.
  ///
  /// In en, this message translates to:
  /// **'Send reply'**
  String get inboxReplySend;

  /// No description provided for @inboxReplySent.
  ///
  /// In en, this message translates to:
  /// **'Reply sent'**
  String get inboxReplySent;

  /// No description provided for @inboxReplyReadOnly.
  ///
  /// In en, this message translates to:
  /// **'Your role can read this conversation but not reply to it.'**
  String get inboxReplyReadOnly;

  /// No description provided for @inboxMessagesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No messages in this thread yet.'**
  String get inboxMessagesEmpty;

  /// No description provided for @inboxSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get inboxSending;

  /// No description provided for @inboxCharacterCount.
  ///
  /// In en, this message translates to:
  /// **'{count} / {max}'**
  String inboxCharacterCount(int count, int max);

  /// No description provided for @inboxYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get inboxYou;

  /// No description provided for @inboxTeam.
  ///
  /// In en, this message translates to:
  /// **'Team'**
  String get inboxTeam;

  /// No description provided for @inboxToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get inboxToday;

  /// No description provided for @inboxYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get inboxYesterday;

  /// No description provided for @inboxMessageLabel.
  ///
  /// In en, this message translates to:
  /// **'{author}, {time}: {body}'**
  String inboxMessageLabel(String author, String time, String body);

  /// No description provided for @inboxRowLabel.
  ///
  /// In en, this message translates to:
  /// **'{author}, {status}, {time}'**
  String inboxRowLabel(String author, String status, String time);

  /// No description provided for @navIntegrations.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get navIntegrations;

  /// No description provided for @integrationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get integrationsTitle;

  /// No description provided for @integrationsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search providers, handles or clients'**
  String get integrationsSearch;

  /// No description provided for @integrationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No connections yet'**
  String get integrationsEmpty;

  /// No description provided for @integrationsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Connect provider accounts so publishing, inbox and reports stay in sync.'**
  String get integrationsEmptyBody;

  /// No description provided for @integrationStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING{Pending} CONNECTED{Connected} DISCONNECTED{Disconnected} ERROR{Error} other{{status}}}'**
  String integrationStatus(String status);

  /// No description provided for @integrationStatusField.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get integrationStatusField;

  /// No description provided for @integrationProviderFallback.
  ///
  /// In en, this message translates to:
  /// **'Provider {id}'**
  String integrationProviderFallback(String id);

  /// No description provided for @integrationOrgWide.
  ///
  /// In en, this message translates to:
  /// **'Whole agency'**
  String get integrationOrgWide;

  /// No description provided for @integrationLastSync.
  ///
  /// In en, this message translates to:
  /// **'Synced {when}'**
  String integrationLastSync(String when);

  /// No description provided for @integrationNeverSynced.
  ///
  /// In en, this message translates to:
  /// **'Never synced'**
  String get integrationNeverSynced;

  /// No description provided for @integrationSince.
  ///
  /// In en, this message translates to:
  /// **'Since {date}'**
  String integrationSince(String date);

  /// No description provided for @integrationConnect.
  ///
  /// In en, this message translates to:
  /// **'Connect account'**
  String get integrationConnect;

  /// No description provided for @integrationConnectSubmit.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get integrationConnectSubmit;

  /// No description provided for @integrationEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit connection'**
  String get integrationEdit;

  /// No description provided for @integrationKnownProviders.
  ///
  /// In en, this message translates to:
  /// **'Providers already in use'**
  String get integrationKnownProviders;

  /// No description provided for @integrationProviderId.
  ///
  /// In en, this message translates to:
  /// **'Provider ID'**
  String get integrationProviderId;

  /// No description provided for @integrationProviderIdHint.
  ///
  /// In en, this message translates to:
  /// **'The provider\'s identifier from your integration settings.'**
  String get integrationProviderIdHint;

  /// No description provided for @integrationProviderIdInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid provider ID'**
  String get integrationProviderIdInvalid;

  /// No description provided for @integrationProviderName.
  ///
  /// In en, this message translates to:
  /// **'Provider name'**
  String get integrationProviderName;

  /// No description provided for @integrationProviderNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Meta'**
  String get integrationProviderNameHint;

  /// No description provided for @integrationClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get integrationClient;

  /// No description provided for @integrationHandle.
  ///
  /// In en, this message translates to:
  /// **'Account handle'**
  String get integrationHandle;

  /// No description provided for @integrationHandleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. @lumencoffee'**
  String get integrationHandleHint;

  /// No description provided for @integrationCreatedToast.
  ///
  /// In en, this message translates to:
  /// **'Connection added — it stays pending until the provider confirms it'**
  String get integrationCreatedToast;

  /// No description provided for @integrationMarkConnected.
  ///
  /// In en, this message translates to:
  /// **'Mark as connected'**
  String get integrationMarkConnected;

  /// No description provided for @integrationDisconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get integrationDisconnect;

  /// No description provided for @integrationDisconnectTitle.
  ///
  /// In en, this message translates to:
  /// **'Disconnect {provider}?'**
  String integrationDisconnectTitle(String provider);

  /// No description provided for @integrationDisconnectBody.
  ///
  /// In en, this message translates to:
  /// **'Publishing and syncing stop for this account. Past content stays, and you can reconnect later.'**
  String get integrationDisconnectBody;

  /// No description provided for @integrationConnectedToast.
  ///
  /// In en, this message translates to:
  /// **'{provider} connected'**
  String integrationConnectedToast(String provider);

  /// No description provided for @integrationDisconnectedToast.
  ///
  /// In en, this message translates to:
  /// **'{provider} disconnected'**
  String integrationDisconnectedToast(String provider);

  /// No description provided for @integrationKpiConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get integrationKpiConnected;

  /// No description provided for @integrationKpiIssues.
  ///
  /// In en, this message translates to:
  /// **'Needs attention'**
  String get integrationKpiIssues;

  /// No description provided for @integrationKpiPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get integrationKpiPending;

  /// No description provided for @navInvoices.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get navInvoices;

  /// No description provided for @invoicesTitle.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get invoicesTitle;

  /// No description provided for @invoicesSearch.
  ///
  /// In en, this message translates to:
  /// **'Search by number or client'**
  String get invoicesSearch;

  /// No description provided for @invoicesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No invoices yet'**
  String get invoicesEmpty;

  /// No description provided for @invoicesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create your first invoice to bill a client and track what is outstanding.'**
  String get invoicesEmptyBody;

  /// No description provided for @invoicesEmptyPortalBody.
  ///
  /// In en, this message translates to:
  /// **'Invoices from your agency will appear here once they are sent.'**
  String get invoicesEmptyPortalBody;

  /// No description provided for @invoiceNew.
  ///
  /// In en, this message translates to:
  /// **'New invoice'**
  String get invoiceNew;

  /// No description provided for @invoiceEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit invoice'**
  String get invoiceEdit;

  /// No description provided for @invoiceEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit {number}'**
  String invoiceEditTitle(String number);

  /// No description provided for @invoiceClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get invoiceClient;

  /// No description provided for @invoiceClientUnknown.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get invoiceClientUnknown;

  /// No description provided for @invoiceFilterValue.
  ///
  /// In en, this message translates to:
  /// **'{label}: {value}'**
  String invoiceFilterValue(String label, String value);

  /// No description provided for @invoiceStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} SENT{Sent} PAID{Paid} OVERDUE{Overdue} VOID{Void} other{{status}}}'**
  String invoiceStatus(String status);

  /// No description provided for @invoiceStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get invoiceStatusLabel;

  /// No description provided for @invoiceStatusDraftHint.
  ///
  /// In en, this message translates to:
  /// **'Save privately and send it later.'**
  String get invoiceStatusDraftHint;

  /// No description provided for @invoiceStatusSentHint.
  ///
  /// In en, this message translates to:
  /// **'Issue it now; it can no longer be edited.'**
  String get invoiceStatusSentHint;

  /// No description provided for @invoiceCardSemantics.
  ///
  /// In en, this message translates to:
  /// **'Invoice {number} for {client}, {status}, {total}'**
  String invoiceCardSemantics(
    String number,
    String client,
    String status,
    String total,
  );

  /// No description provided for @invoiceIssuedOn.
  ///
  /// In en, this message translates to:
  /// **'Issued {date}'**
  String invoiceIssuedOn(String date);

  /// No description provided for @invoiceCreatedOn.
  ///
  /// In en, this message translates to:
  /// **'Created {date}'**
  String invoiceCreatedOn(String date);

  /// No description provided for @invoiceSummaryOutstanding.
  ///
  /// In en, this message translates to:
  /// **'Outstanding'**
  String get invoiceSummaryOutstanding;

  /// No description provided for @invoiceSummaryOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get invoiceSummaryOverdue;

  /// No description provided for @invoiceSummaryPaidThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Paid this month'**
  String get invoiceSummaryPaidThisMonth;

  /// No description provided for @invoiceSummaryDrafts.
  ///
  /// In en, this message translates to:
  /// **'Drafts'**
  String get invoiceSummaryDrafts;

  /// No description provided for @invoiceCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 invoice} other{{count} invoices}}'**
  String invoiceCount(int count);

  /// No description provided for @invoiceDocumentTitle.
  ///
  /// In en, this message translates to:
  /// **'Invoice'**
  String get invoiceDocumentTitle;

  /// No description provided for @invoiceBillTo.
  ///
  /// In en, this message translates to:
  /// **'Bill to'**
  String get invoiceBillTo;

  /// No description provided for @invoiceIssued.
  ///
  /// In en, this message translates to:
  /// **'Issued'**
  String get invoiceIssued;

  /// No description provided for @invoiceNotIssued.
  ///
  /// In en, this message translates to:
  /// **'Not issued yet'**
  String get invoiceNotIssued;

  /// No description provided for @invoiceDue.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get invoiceDue;

  /// No description provided for @invoicePaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get invoicePaid;

  /// No description provided for @invoiceLineItems.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Line items} =1{1 line item} other{{count} line items}}'**
  String invoiceLineItems(int count);

  /// No description provided for @invoiceNoLines.
  ///
  /// In en, this message translates to:
  /// **'This invoice has no line items.'**
  String get invoiceNoLines;

  /// No description provided for @invoiceLineDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get invoiceLineDescription;

  /// No description provided for @invoiceLineQuantity.
  ///
  /// In en, this message translates to:
  /// **'Qty'**
  String get invoiceLineQuantity;

  /// No description provided for @invoiceLineUnitPrice.
  ///
  /// In en, this message translates to:
  /// **'Unit price'**
  String get invoiceLineUnitPrice;

  /// No description provided for @invoiceLineAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get invoiceLineAmount;

  /// No description provided for @invoiceLineQuantityTimesUnit.
  ///
  /// In en, this message translates to:
  /// **'{quantity} × {unit}'**
  String invoiceLineQuantityTimesUnit(String quantity, String unit);

  /// No description provided for @invoiceLineSemantics.
  ///
  /// In en, this message translates to:
  /// **'{description}: {quantity} at {unit}, {amount}'**
  String invoiceLineSemantics(
    String description,
    int quantity,
    String unit,
    String amount,
  );

  /// No description provided for @invoiceLinePosition.
  ///
  /// In en, this message translates to:
  /// **'Line {position} of {count}'**
  String invoiceLinePosition(int position, int count);

  /// No description provided for @invoiceLineAdd.
  ///
  /// In en, this message translates to:
  /// **'Add line'**
  String get invoiceLineAdd;

  /// No description provided for @invoiceLineRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove line'**
  String get invoiceLineRemove;

  /// No description provided for @invoiceLineMoveUp.
  ///
  /// In en, this message translates to:
  /// **'Move line up'**
  String get invoiceLineMoveUp;

  /// No description provided for @invoiceLineMoveDown.
  ///
  /// In en, this message translates to:
  /// **'Move line down'**
  String get invoiceLineMoveDown;

  /// No description provided for @invoiceLinesFull.
  ///
  /// In en, this message translates to:
  /// **'Up to {max} lines'**
  String invoiceLinesFull(int max);

  /// No description provided for @invoiceSubtotal.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get invoiceSubtotal;

  /// No description provided for @invoiceTax.
  ///
  /// In en, this message translates to:
  /// **'Tax ({rate}%)'**
  String invoiceTax(String rate);

  /// No description provided for @invoiceTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get invoiceTotal;

  /// No description provided for @invoiceTotalsSemantics.
  ///
  /// In en, this message translates to:
  /// **'Subtotal {subtotal}, tax {tax}, total {total}'**
  String invoiceTotalsSemantics(String subtotal, String tax, String total);

  /// No description provided for @invoiceCopyNumber.
  ///
  /// In en, this message translates to:
  /// **'Copy number'**
  String get invoiceCopyNumber;

  /// No description provided for @invoiceCopied.
  ///
  /// In en, this message translates to:
  /// **'Invoice number copied'**
  String get invoiceCopied;

  /// No description provided for @invoiceShare.
  ///
  /// In en, this message translates to:
  /// **'Copy summary'**
  String get invoiceShare;

  /// No description provided for @invoiceSummaryCopied.
  ///
  /// In en, this message translates to:
  /// **'Invoice summary copied'**
  String get invoiceSummaryCopied;

  /// No description provided for @invoiceShareText.
  ///
  /// In en, this message translates to:
  /// **'Invoice {number} for {client}: {total}, due {due}'**
  String invoiceShareText(
    String number,
    String client,
    String total,
    String due,
  );

  /// No description provided for @invoiceTransitionAction.
  ///
  /// In en, this message translates to:
  /// **'{status, select, SENT{Mark as sent} PAID{Mark as paid} VOID{Void invoice} other{Update status}}'**
  String invoiceTransitionAction(String status);

  /// No description provided for @invoiceTransitionDone.
  ///
  /// In en, this message translates to:
  /// **'{status, select, SENT{Invoice sent} PAID{Payment recorded} VOID{Invoice voided} other{Status updated}}'**
  String invoiceTransitionDone(String status);

  /// No description provided for @invoiceTransitionConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PAID{Mark {number} as paid?} VOID{Void {number}?} other{Update {number}?}}'**
  String invoiceTransitionConfirmTitle(String status, String number);

  /// No description provided for @invoiceTransitionConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PAID{A payment for the full total is recorded today.} VOID{A void invoice stays on record but can no longer be paid or edited.} other{The invoice status will change.}}'**
  String invoiceTransitionConfirmBody(String status);

  /// No description provided for @invoiceNotEditable.
  ///
  /// In en, this message translates to:
  /// **'Only drafts can be edited'**
  String get invoiceNotEditable;

  /// No description provided for @invoiceNotEditableBody.
  ///
  /// In en, this message translates to:
  /// **'Once an invoice is sent it becomes a financial record. Void it and create a new one instead.'**
  String get invoiceNotEditableBody;

  /// No description provided for @invoiceBackToInvoice.
  ///
  /// In en, this message translates to:
  /// **'Back to invoice'**
  String get invoiceBackToInvoice;

  /// No description provided for @invoiceDetailsSection.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get invoiceDetailsSection;

  /// No description provided for @invoiceSummarySection.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get invoiceSummarySection;

  /// No description provided for @invoiceNumber.
  ///
  /// In en, this message translates to:
  /// **'Invoice number'**
  String get invoiceNumber;

  /// No description provided for @invoiceNumberHint.
  ///
  /// In en, this message translates to:
  /// **'Suggested from your numbering sequence'**
  String get invoiceNumberHint;

  /// No description provided for @invoiceNumberLocked.
  ///
  /// In en, this message translates to:
  /// **'The number cannot change after creation'**
  String get invoiceNumberLocked;

  /// No description provided for @invoiceNumberTaken.
  ///
  /// In en, this message translates to:
  /// **'That invoice number is already in use.'**
  String get invoiceNumberTaken;

  /// No description provided for @invoiceTaxRate.
  ///
  /// In en, this message translates to:
  /// **'Tax rate'**
  String get invoiceTaxRate;

  /// No description provided for @invoiceTaxRateRange.
  ///
  /// In en, this message translates to:
  /// **'Use a rate from 0 to {max}'**
  String invoiceTaxRateRange(int max);

  /// No description provided for @invoiceDecimalsMax.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Use at most 1 decimal} other{Use at most {count} decimals}}'**
  String invoiceDecimalsMax(int count);

  /// No description provided for @invoiceQuantityRange.
  ///
  /// In en, this message translates to:
  /// **'Use a whole number from 1 to {max}'**
  String invoiceQuantityRange(int max);

  /// No description provided for @invoiceAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid amount'**
  String get invoiceAmountInvalid;

  /// No description provided for @invoiceTotalTooLarge.
  ///
  /// In en, this message translates to:
  /// **'The invoice total is too large.'**
  String get invoiceTotalTooLarge;

  /// No description provided for @invoiceCreateAndSend.
  ///
  /// In en, this message translates to:
  /// **'Create and send'**
  String get invoiceCreateAndSend;

  /// No description provided for @invoiceSaveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save draft'**
  String get invoiceSaveDraft;

  /// No description provided for @invoiceFormHint.
  ///
  /// In en, this message translates to:
  /// **'Amounts are in the invoice currency. Tax is calculated once on the subtotal.'**
  String get invoiceFormHint;

  /// No description provided for @navKnowledge.
  ///
  /// In en, this message translates to:
  /// **'Knowledge base'**
  String get navKnowledge;

  /// No description provided for @knowledgeTitle.
  ///
  /// In en, this message translates to:
  /// **'Knowledge base'**
  String get knowledgeTitle;

  /// No description provided for @knowledgeSearch.
  ///
  /// In en, this message translates to:
  /// **'Search articles'**
  String get knowledgeSearch;

  /// No description provided for @knowledgeEmpty.
  ///
  /// In en, this message translates to:
  /// **'No articles yet'**
  String get knowledgeEmpty;

  /// No description provided for @knowledgeEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Write down how your agency works — SOPs, playbooks and policies — so everyone does it the same way.'**
  String get knowledgeEmptyBody;

  /// No description provided for @knowledgeNew.
  ///
  /// In en, this message translates to:
  /// **'New article'**
  String get knowledgeNew;

  /// No description provided for @knowledgeEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit article'**
  String get knowledgeEdit;

  /// No description provided for @knowledgePublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get knowledgePublish;

  /// No description provided for @knowledgePublishedToast.
  ///
  /// In en, this message translates to:
  /// **'Article published'**
  String get knowledgePublishedToast;

  /// No description provided for @knowledgeCategory.
  ///
  /// In en, this message translates to:
  /// **'{category, select, SOP{SOP} PLAYBOOK{Playbook} TEMPLATE{Template} POLICY{Policy} ONBOARDING{Onboarding} other{{category}}}'**
  String knowledgeCategory(String category);

  /// No description provided for @knowledgeCategoryField.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get knowledgeCategoryField;

  /// No description provided for @knowledgeTitleField.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get knowledgeTitleField;

  /// No description provided for @knowledgeTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. How we onboard a new client'**
  String get knowledgeTitleHint;

  /// No description provided for @knowledgeBodyField.
  ///
  /// In en, this message translates to:
  /// **'Article'**
  String get knowledgeBodyField;

  /// No description provided for @knowledgeBodyHint.
  ///
  /// In en, this message translates to:
  /// **'Leave a blank line between paragraphs. A block of several lines becomes a checklist.'**
  String get knowledgeBodyHint;

  /// No description provided for @knowledgeWrite.
  ///
  /// In en, this message translates to:
  /// **'Write'**
  String get knowledgeWrite;

  /// No description provided for @knowledgePreview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get knowledgePreview;

  /// No description provided for @knowledgePreviewEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing to preview yet.'**
  String get knowledgePreviewEmpty;

  /// No description provided for @knowledgeBodyEmpty.
  ///
  /// In en, this message translates to:
  /// **'This article has no content yet.'**
  String get knowledgeBodyEmpty;

  /// No description provided for @knowledgeReadTime.
  ///
  /// In en, this message translates to:
  /// **'{minutes, plural, =1{1 min read} other{{minutes} min read}}'**
  String knowledgeReadTime(int minutes);

  /// No description provided for @knowledgeByAuthor.
  ///
  /// In en, this message translates to:
  /// **'{name} · {when}'**
  String knowledgeByAuthor(String name, String when);

  /// No description provided for @knowledgeUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated {when}'**
  String knowledgeUpdated(String when);

  /// No description provided for @knowledgeVersionFooter.
  ///
  /// In en, this message translates to:
  /// **'Version {version} · First written {date}'**
  String knowledgeVersionFooter(int version, String date);

  /// No description provided for @knowledgeStatArticles.
  ///
  /// In en, this message translates to:
  /// **'Articles'**
  String get knowledgeStatArticles;

  /// No description provided for @knowledgeStatCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get knowledgeStatCategories;

  /// No description provided for @knowledgeStatReading.
  ///
  /// In en, this message translates to:
  /// **'Total read time'**
  String get knowledgeStatReading;

  /// No description provided for @navLeads.
  ///
  /// In en, this message translates to:
  /// **'Pipeline'**
  String get navLeads;

  /// No description provided for @leadsTitle.
  ///
  /// In en, this message translates to:
  /// **'Pipeline'**
  String get leadsTitle;

  /// No description provided for @leadsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search company or contact'**
  String get leadsSearch;

  /// No description provided for @leadsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No leads yet'**
  String get leadsEmpty;

  /// No description provided for @leadsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add prospects to track every deal from first contact to signed client.'**
  String get leadsEmptyBody;

  /// No description provided for @leadsViewBoard.
  ///
  /// In en, this message translates to:
  /// **'Show board'**
  String get leadsViewBoard;

  /// No description provided for @leadsViewList.
  ///
  /// In en, this message translates to:
  /// **'Show list'**
  String get leadsViewList;

  /// No description provided for @leadsStatOpen.
  ///
  /// In en, this message translates to:
  /// **'Open pipeline'**
  String get leadsStatOpen;

  /// No description provided for @leadsStatOpenHint.
  ///
  /// In en, this message translates to:
  /// **'Deals in progress'**
  String get leadsStatOpenHint;

  /// No description provided for @leadsStatForecast.
  ///
  /// In en, this message translates to:
  /// **'Weighted forecast'**
  String get leadsStatForecast;

  /// No description provided for @leadsStatForecastHint.
  ///
  /// In en, this message translates to:
  /// **'Open value × stage probability'**
  String get leadsStatForecastHint;

  /// No description provided for @leadsStatWon.
  ///
  /// In en, this message translates to:
  /// **'Won'**
  String get leadsStatWon;

  /// No description provided for @leadsStatWonHint.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No deals won yet} =1{1 deal won} other{{count} deals won}}'**
  String leadsStatWonHint(int count);

  /// No description provided for @leadsStatWinRate.
  ///
  /// In en, this message translates to:
  /// **'Win rate'**
  String get leadsStatWinRate;

  /// No description provided for @leadsStatWinRateHint.
  ///
  /// In en, this message translates to:
  /// **'Won ÷ closed deals'**
  String get leadsStatWinRateHint;

  /// No description provided for @leadsColumnSummary.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No leads} =1{1 lead} other{{count} leads}} · {value}'**
  String leadsColumnSummary(int count, String value);

  /// No description provided for @leadsColumnEmpty.
  ///
  /// In en, this message translates to:
  /// **'No leads in this stage'**
  String get leadsColumnEmpty;

  /// No description provided for @leadsColumnDrop.
  ///
  /// In en, this message translates to:
  /// **'Drop here to move to {stage}'**
  String leadsColumnDrop(String stage);

  /// No description provided for @leadsFilterOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get leadsFilterOwner;

  /// No description provided for @leadsFilterOwnerMe.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get leadsFilterOwnerMe;

  /// No description provided for @leadsFilterFollowUp.
  ///
  /// In en, this message translates to:
  /// **'Follow-up due'**
  String get leadsFilterFollowUp;

  /// No description provided for @leadsClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get leadsClearFilters;

  /// No description provided for @leadNew.
  ///
  /// In en, this message translates to:
  /// **'New lead'**
  String get leadNew;

  /// No description provided for @leadEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit lead'**
  String get leadEdit;

  /// No description provided for @leadDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete lead'**
  String get leadDelete;

  /// No description provided for @leadStage.
  ///
  /// In en, this message translates to:
  /// **'{stage, select, NEW{New} CONTACTED{Contacted} PROPOSAL{Proposal} NEGOTIATION{Negotiation} WON{Won} LOST{Lost} other{{stage}}}'**
  String leadStage(String stage);

  /// No description provided for @leadStageLabel.
  ///
  /// In en, this message translates to:
  /// **'Stage'**
  String get leadStageLabel;

  /// No description provided for @leadStageProgress.
  ///
  /// In en, this message translates to:
  /// **'Stage {current} of {total}'**
  String leadStageProgress(int current, int total);

  /// No description provided for @leadMoveTo.
  ///
  /// In en, this message translates to:
  /// **'Move to stage'**
  String get leadMoveTo;

  /// No description provided for @leadMovedToast.
  ///
  /// In en, this message translates to:
  /// **'Moved to {stage}'**
  String leadMovedToast(String stage);

  /// No description provided for @leadAdvance.
  ///
  /// In en, this message translates to:
  /// **'Advance to {stage}'**
  String leadAdvance(String stage);

  /// No description provided for @leadStepBack.
  ///
  /// In en, this message translates to:
  /// **'Back to {stage}'**
  String leadStepBack(String stage);

  /// No description provided for @leadMarkWon.
  ///
  /// In en, this message translates to:
  /// **'Mark won'**
  String get leadMarkWon;

  /// No description provided for @leadMarkLost.
  ///
  /// In en, this message translates to:
  /// **'Mark lost'**
  String get leadMarkLost;

  /// No description provided for @leadReopen.
  ///
  /// In en, this message translates to:
  /// **'Reopen deal'**
  String get leadReopen;

  /// No description provided for @leadCompany.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get leadCompany;

  /// No description provided for @leadCompanyHint.
  ///
  /// In en, this message translates to:
  /// **'Acme Studio'**
  String get leadCompanyHint;

  /// No description provided for @leadContact.
  ///
  /// In en, this message translates to:
  /// **'Contact name'**
  String get leadContact;

  /// No description provided for @leadEmail.
  ///
  /// In en, this message translates to:
  /// **'Contact email'**
  String get leadEmail;

  /// No description provided for @leadIndustry.
  ///
  /// In en, this message translates to:
  /// **'Industry'**
  String get leadIndustry;

  /// No description provided for @leadWebsite.
  ///
  /// In en, this message translates to:
  /// **'Website'**
  String get leadWebsite;

  /// No description provided for @leadWebsiteHint.
  ///
  /// In en, this message translates to:
  /// **'example.com'**
  String get leadWebsiteHint;

  /// No description provided for @leadSource.
  ///
  /// In en, this message translates to:
  /// **'Source'**
  String get leadSource;

  /// No description provided for @leadSourceHint.
  ///
  /// In en, this message translates to:
  /// **'Referral, website, event…'**
  String get leadSourceHint;

  /// No description provided for @leadValue.
  ///
  /// In en, this message translates to:
  /// **'Estimated value'**
  String get leadValue;

  /// No description provided for @leadValueHint.
  ///
  /// In en, this message translates to:
  /// **'Amount in {currency}'**
  String leadValueHint(String currency);

  /// No description provided for @leadValueInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount of zero or more'**
  String get leadValueInvalid;

  /// No description provided for @leadOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get leadOwner;

  /// No description provided for @leadNextStep.
  ///
  /// In en, this message translates to:
  /// **'Next step'**
  String get leadNextStep;

  /// No description provided for @leadNextStepHint.
  ///
  /// In en, this message translates to:
  /// **'Send proposal, book a call…'**
  String get leadNextStepHint;

  /// No description provided for @leadNextStepAt.
  ///
  /// In en, this message translates to:
  /// **'Next step date'**
  String get leadNextStepAt;

  /// No description provided for @leadNextStepEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit next step'**
  String get leadNextStepEdit;

  /// No description provided for @leadNextStepEmpty.
  ///
  /// In en, this message translates to:
  /// **'No next step planned. Add one so the deal keeps moving.'**
  String get leadNextStepEmpty;

  /// No description provided for @leadProbability.
  ///
  /// In en, this message translates to:
  /// **'Win probability'**
  String get leadProbability;

  /// No description provided for @leadWeightedValue.
  ///
  /// In en, this message translates to:
  /// **'Weighted value'**
  String get leadWeightedValue;

  /// No description provided for @leadDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get leadDetails;

  /// No description provided for @leadContactSection.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get leadContactSection;

  /// No description provided for @leadEmailContact.
  ///
  /// In en, this message translates to:
  /// **'Email {name}'**
  String leadEmailContact(String name);

  /// No description provided for @leadCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get leadCreated;

  /// No description provided for @leadUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get leadUpdated;

  /// No description provided for @leadConverted.
  ///
  /// In en, this message translates to:
  /// **'Converted to client'**
  String get leadConverted;

  /// No description provided for @leadOpenClient.
  ///
  /// In en, this message translates to:
  /// **'Open client'**
  String get leadOpenClient;

  /// No description provided for @leadCardLabel.
  ///
  /// In en, this message translates to:
  /// **'{company}, {stage}, {value}'**
  String leadCardLabel(String company, String stage, String value);

  /// No description provided for @navMedia.
  ///
  /// In en, this message translates to:
  /// **'Assets'**
  String get navMedia;

  /// No description provided for @mediaTitle.
  ///
  /// In en, this message translates to:
  /// **'Assets'**
  String get mediaTitle;

  /// No description provided for @mediaSearch.
  ///
  /// In en, this message translates to:
  /// **'Search files'**
  String get mediaSearch;

  /// No description provided for @mediaEmpty.
  ///
  /// In en, this message translates to:
  /// **'No files yet'**
  String get mediaEmpty;

  /// No description provided for @mediaEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Upload images, videos and documents to share them with your team and use them in posts.'**
  String get mediaEmptyBody;

  /// No description provided for @mediaUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get mediaUpload;

  /// No description provided for @mediaFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get mediaFilterClient;

  /// No description provided for @mediaKind.
  ///
  /// In en, this message translates to:
  /// **'{kind, select, image{Images} video{Videos} document{Documents} other{{kind}}}'**
  String mediaKind(String kind);

  /// No description provided for @mediaStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING_UPLOAD{Uploading} READY{Ready} FAILED{Failed} other{{status}}}'**
  String mediaStatus(String status);

  /// No description provided for @mediaTileSemantics.
  ///
  /// In en, this message translates to:
  /// **'{name}, {kind}, {status}'**
  String mediaTileSemantics(String name, String kind, String status);

  /// No description provided for @mediaUploadedToast.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 file uploaded} other{{count} files uploaded}}'**
  String mediaUploadedToast(int count);

  /// No description provided for @mediaUploadInProgress.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 upload in progress} other{{count} uploads in progress}}'**
  String mediaUploadInProgress(int count);

  /// No description provided for @mediaUploadPickTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose files to upload'**
  String get mediaUploadPickTitle;

  /// No description provided for @mediaUploadClientTitle.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Upload 1 file} other{Upload {count} files}}'**
  String mediaUploadClientTitle(int count);

  /// No description provided for @mediaUploadClientBody.
  ///
  /// In en, this message translates to:
  /// **'Files are filed under a client so they can be used in that client’s posts.'**
  String get mediaUploadClientBody;

  /// No description provided for @mediaUploadStart.
  ///
  /// In en, this message translates to:
  /// **'Start upload'**
  String get mediaUploadStart;

  /// No description provided for @mediaUploadTitle.
  ///
  /// In en, this message translates to:
  /// **'Uploads'**
  String get mediaUploadTitle;

  /// No description provided for @mediaUploadProgress.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} uploaded'**
  String mediaUploadProgress(int done, int total);

  /// No description provided for @mediaUploadSummary.
  ///
  /// In en, this message translates to:
  /// **'{failed, plural, =0{{done} uploaded} other{{done} uploaded, {failed} failed}}'**
  String mediaUploadSummary(int done, int failed);

  /// No description provided for @mediaUploadRetryAll.
  ///
  /// In en, this message translates to:
  /// **'Retry failed'**
  String get mediaUploadRetryAll;

  /// No description provided for @mediaUploadHide.
  ///
  /// In en, this message translates to:
  /// **'Hide'**
  String get mediaUploadHide;

  /// No description provided for @mediaUploadQueued.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get mediaUploadQueued;

  /// No description provided for @mediaUploadSending.
  ///
  /// In en, this message translates to:
  /// **'Uploading'**
  String get mediaUploadSending;

  /// No description provided for @mediaUploadFinishing.
  ///
  /// In en, this message translates to:
  /// **'Finishing'**
  String get mediaUploadFinishing;

  /// No description provided for @mediaUploadDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get mediaUploadDone;

  /// No description provided for @mediaUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get mediaUploadFailed;

  /// No description provided for @mediaUploadPercent.
  ///
  /// In en, this message translates to:
  /// **'{percent}%'**
  String mediaUploadPercent(int percent);

  /// No description provided for @mediaUploadBytes.
  ///
  /// In en, this message translates to:
  /// **'{sent} of {total}'**
  String mediaUploadBytes(String sent, String total);

  /// No description provided for @mediaUploadErrorEmpty.
  ///
  /// In en, this message translates to:
  /// **'This file is empty.'**
  String get mediaUploadErrorEmpty;

  /// No description provided for @mediaUploadErrorNameTooLong.
  ///
  /// In en, this message translates to:
  /// **'File names can be at most {max} characters.'**
  String mediaUploadErrorNameTooLong(int max);

  /// No description provided for @mediaUploadErrorType.
  ///
  /// In en, this message translates to:
  /// **'This file type isn’t allowed.'**
  String get mediaUploadErrorType;

  /// No description provided for @mediaUploadErrorSize.
  ///
  /// In en, this message translates to:
  /// **'This file is larger than the upload limit.'**
  String get mediaUploadErrorSize;

  /// No description provided for @mediaUploadErrorIncomplete.
  ///
  /// In en, this message translates to:
  /// **'The upload didn’t finish. Try again.'**
  String get mediaUploadErrorIncomplete;

  /// No description provided for @mediaEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit file details'**
  String get mediaEditTitle;

  /// No description provided for @mediaDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'The file is removed from the library and from any posts that use it.'**
  String get mediaDeleteBody;

  /// No description provided for @mediaFieldName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get mediaFieldName;

  /// No description provided for @mediaFieldClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get mediaFieldClient;

  /// No description provided for @mediaFieldKind.
  ///
  /// In en, this message translates to:
  /// **'Kind'**
  String get mediaFieldKind;

  /// No description provided for @mediaFieldType.
  ///
  /// In en, this message translates to:
  /// **'File type'**
  String get mediaFieldType;

  /// No description provided for @mediaFieldSize.
  ///
  /// In en, this message translates to:
  /// **'Size'**
  String get mediaFieldSize;

  /// No description provided for @mediaFieldUploadedBy.
  ///
  /// In en, this message translates to:
  /// **'Uploaded by'**
  String get mediaFieldUploadedBy;

  /// No description provided for @mediaFieldUploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded'**
  String get mediaFieldUploaded;

  /// No description provided for @mediaFieldUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get mediaFieldUpdated;

  /// No description provided for @mediaFieldVersion.
  ///
  /// In en, this message translates to:
  /// **'Version'**
  String get mediaFieldVersion;

  /// No description provided for @mediaVersion.
  ///
  /// In en, this message translates to:
  /// **'v{version}'**
  String mediaVersion(int version);

  /// No description provided for @mediaNoClient.
  ///
  /// In en, this message translates to:
  /// **'No client'**
  String get mediaNoClient;

  /// No description provided for @mediaYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get mediaYou;

  /// No description provided for @mediaOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get mediaOpen;

  /// No description provided for @mediaDownload.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get mediaDownload;

  /// No description provided for @mediaOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t open the file'**
  String get mediaOpenFailed;

  /// No description provided for @mediaZoomHint.
  ///
  /// In en, this message translates to:
  /// **'Pinch or scroll to zoom'**
  String get mediaZoomHint;

  /// No description provided for @mediaPreviewSemantics.
  ///
  /// In en, this message translates to:
  /// **'Preview of {name}'**
  String mediaPreviewSemantics(String name);

  /// No description provided for @mediaNotReadyBody.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING_UPLOAD{This file is still uploading. It can be opened once the upload finishes.} FAILED{This upload failed. Delete it and upload the file again.} other{This file isn’t available yet.}}'**
  String mediaNotReadyBody(String status);

  /// No description provided for @mediaPickerTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose media'**
  String get mediaPickerTitle;

  /// No description provided for @mediaPickerEmpty.
  ///
  /// In en, this message translates to:
  /// **'No ready files for this client'**
  String get mediaPickerEmpty;

  /// No description provided for @mediaPickerEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Upload images or videos to use them in this post.'**
  String get mediaPickerEmptyBody;

  /// No description provided for @mediaPickerSelected.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing selected} =1{1 selected} other{{count} selected}}'**
  String mediaPickerSelected(int count);

  /// No description provided for @mediaPickerSelectedOf.
  ///
  /// In en, this message translates to:
  /// **'{count} of {max} selected'**
  String mediaPickerSelectedOf(int count, int max);

  /// No description provided for @mediaPickerConfirm.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Add} other{Add {count}}}'**
  String mediaPickerConfirm(int count);

  /// No description provided for @mediaStatAll.
  ///
  /// In en, this message translates to:
  /// **'Files'**
  String get mediaStatAll;

  /// No description provided for @mediaStatImages.
  ///
  /// In en, this message translates to:
  /// **'Images'**
  String get mediaStatImages;

  /// No description provided for @mediaStatVideos.
  ///
  /// In en, this message translates to:
  /// **'Videos'**
  String get mediaStatVideos;

  /// No description provided for @mediaStatDocs.
  ///
  /// In en, this message translates to:
  /// **'Documents'**
  String get mediaStatDocs;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @messagesSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search conversations'**
  String get messagesSearchHint;

  /// No description provided for @messagesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No conversations yet'**
  String get messagesEmpty;

  /// No description provided for @messagesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Start a conversation with a client, or wait for them to message you.'**
  String get messagesEmptyBody;

  /// No description provided for @messagesEmptyPortalBody.
  ///
  /// In en, this message translates to:
  /// **'Message your agency when you have a question or feedback.'**
  String get messagesEmptyPortalBody;

  /// No description provided for @messagesSelectTitle.
  ///
  /// In en, this message translates to:
  /// **'Select a conversation'**
  String get messagesSelectTitle;

  /// No description provided for @messagesSelectBody.
  ///
  /// In en, this message translates to:
  /// **'Pick a thread from the list to read and reply.'**
  String get messagesSelectBody;

  /// No description provided for @messagesThreadCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No threads} =1{1 thread} other{{count} threads}}'**
  String messagesThreadCount(int count);

  /// No description provided for @messagesNew.
  ///
  /// In en, this message translates to:
  /// **'New conversation'**
  String get messagesNew;

  /// No description provided for @messagesNewPortal.
  ///
  /// In en, this message translates to:
  /// **'Message agency'**
  String get messagesNewPortal;

  /// No description provided for @messagesNewTitle.
  ///
  /// In en, this message translates to:
  /// **'New conversation'**
  String get messagesNewTitle;

  /// No description provided for @messagesNewPortalTitle.
  ///
  /// In en, this message translates to:
  /// **'Message your agency'**
  String get messagesNewPortalTitle;

  /// No description provided for @messagesClientFilter.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get messagesClientFilter;

  /// No description provided for @messagesClientLabel.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get messagesClientLabel;

  /// No description provided for @messagesFirstMessageLabel.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messagesFirstMessageLabel;

  /// No description provided for @messagesSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get messagesSend;

  /// No description provided for @messagesComposerHint.
  ///
  /// In en, this message translates to:
  /// **'Write a message…'**
  String get messagesComposerHint;

  /// No description provided for @messagesResolve.
  ///
  /// In en, this message translates to:
  /// **'Resolve'**
  String get messagesResolve;

  /// No description provided for @messagesReopen.
  ///
  /// In en, this message translates to:
  /// **'Reopen'**
  String get messagesReopen;

  /// No description provided for @messagesReopenHint.
  ///
  /// In en, this message translates to:
  /// **'This conversation is resolved. Sending a message will reopen it.'**
  String get messagesReopenHint;

  /// No description provided for @messagesResolvedToast.
  ///
  /// In en, this message translates to:
  /// **'Conversation resolved'**
  String get messagesResolvedToast;

  /// No description provided for @messagesReopenedToast.
  ///
  /// In en, this message translates to:
  /// **'Conversation reopened'**
  String get messagesReopenedToast;

  /// No description provided for @messagesOpenPost.
  ///
  /// In en, this message translates to:
  /// **'Open post'**
  String get messagesOpenPost;

  /// No description provided for @messagesReadOnly.
  ///
  /// In en, this message translates to:
  /// **'You can read this conversation but not reply.'**
  String get messagesReadOnly;

  /// No description provided for @messagesNoMessages.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get messagesNoMessages;

  /// No description provided for @messagesNoMessagesBody.
  ///
  /// In en, this message translates to:
  /// **'Send the first message to start the conversation.'**
  String get messagesNoMessagesBody;

  /// No description provided for @messagesPreviewUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Preview unavailable'**
  String get messagesPreviewUnavailable;

  /// No description provided for @messagesPreview.
  ///
  /// In en, this message translates to:
  /// **'{author}: {body}'**
  String messagesPreview(String author, String body);

  /// No description provided for @messagesMessageLabel.
  ///
  /// In en, this message translates to:
  /// **'{author}, {when}: {body}'**
  String messagesMessageLabel(String author, String when, String body);

  /// No description provided for @messagesSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get messagesSending;

  /// No description provided for @messagesToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get messagesToday;

  /// No description provided for @messagesYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get messagesYesterday;

  /// No description provided for @messagesYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get messagesYou;

  /// No description provided for @messagesAgency.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get messagesAgency;

  /// No description provided for @messagesAgencyConversation.
  ///
  /// In en, this message translates to:
  /// **'Your agency'**
  String get messagesAgencyConversation;

  /// No description provided for @messagesClientConversation.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get messagesClientConversation;

  /// No description provided for @messagesContentConversation.
  ///
  /// In en, this message translates to:
  /// **'Content feedback'**
  String get messagesContentConversation;

  /// No description provided for @messagesStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, OPEN{Open} RESOLVED{Resolved} other{{status}}}'**
  String messagesStatus(String status);

  /// No description provided for @portalWelcome.
  ///
  /// In en, this message translates to:
  /// **'Client portal'**
  String get portalWelcome;

  /// No description provided for @portalSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back, {name}. Here is what needs your attention.'**
  String portalSubtitle(String name);

  /// No description provided for @portalSubtitleFallback.
  ///
  /// In en, this message translates to:
  /// **'Here is what needs your attention with your agency.'**
  String get portalSubtitleFallback;

  /// No description provided for @portalEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing to show yet'**
  String get portalEmptyTitle;

  /// No description provided for @portalEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'When your agency shares work, invoices or messages, they will appear here.'**
  String get portalEmptyBody;

  /// No description provided for @portalQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get portalQuickActions;

  /// No description provided for @portalQuickReview.
  ///
  /// In en, this message translates to:
  /// **'Review posts'**
  String get portalQuickReview;

  /// No description provided for @portalQuickInvoices.
  ///
  /// In en, this message translates to:
  /// **'Open invoices'**
  String get portalQuickInvoices;

  /// No description provided for @portalQuickMessage.
  ///
  /// In en, this message translates to:
  /// **'Message agency'**
  String get portalQuickMessage;

  /// No description provided for @portalQuickProjects.
  ///
  /// In en, this message translates to:
  /// **'View projects'**
  String get portalQuickProjects;

  /// No description provided for @portalQuickFiles.
  ///
  /// In en, this message translates to:
  /// **'Open files'**
  String get portalQuickFiles;

  /// No description provided for @portalQuickReports.
  ///
  /// In en, this message translates to:
  /// **'View reports'**
  String get portalQuickReports;

  /// No description provided for @portalKpiAria.
  ///
  /// In en, this message translates to:
  /// **'Portal summary'**
  String get portalKpiAria;

  /// No description provided for @portalKpiRetry.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load · tap to retry'**
  String get portalKpiRetry;

  /// No description provided for @portalKpiApprovals.
  ///
  /// In en, this message translates to:
  /// **'Awaiting your review'**
  String get portalKpiApprovals;

  /// No description provided for @portalKpiApprovalsCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing waiting} =1{1 post ready} other{{count} posts ready}}'**
  String portalKpiApprovalsCaption(int count);

  /// No description provided for @portalKpiInvoices.
  ///
  /// In en, this message translates to:
  /// **'Open invoices'**
  String get portalKpiInvoices;

  /// No description provided for @portalKpiInvoicesCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{All clear} =1{1 needs payment} other{{count} need payment}}'**
  String portalKpiInvoicesCaption(int count);

  /// No description provided for @portalKpiMessages.
  ///
  /// In en, this message translates to:
  /// **'Open conversations'**
  String get portalKpiMessages;

  /// No description provided for @portalKpiMessagesCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Inbox clear} =1{1 open thread} other{{count} open threads}}'**
  String portalKpiMessagesCaption(int count);

  /// No description provided for @portalKpiProjects.
  ///
  /// In en, this message translates to:
  /// **'Active projects'**
  String get portalKpiProjects;

  /// No description provided for @portalKpiProjectsCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{None in flight} =1{1 in progress} other{{count} in progress}}'**
  String portalKpiProjectsCaption(int count);

  /// No description provided for @portalApprovalsTitle.
  ///
  /// In en, this message translates to:
  /// **'Ready for your review'**
  String get portalApprovalsTitle;

  /// No description provided for @portalApprovalsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for your approval right now.'**
  String get portalApprovalsEmpty;

  /// No description provided for @portalApprovalsCta.
  ///
  /// In en, this message translates to:
  /// **'Review posts'**
  String get portalApprovalsCta;

  /// No description provided for @portalInvoicesTitle.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get portalInvoicesTitle;

  /// No description provided for @portalInvoicesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No open invoices. You\'re all caught up.'**
  String get portalInvoicesEmpty;

  /// No description provided for @portalInvoicesCta.
  ///
  /// In en, this message translates to:
  /// **'View invoices'**
  String get portalInvoicesCta;

  /// No description provided for @portalMessagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get portalMessagesTitle;

  /// No description provided for @portalMessagesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No open conversations with your agency.'**
  String get portalMessagesEmpty;

  /// No description provided for @portalMessagesCta.
  ///
  /// In en, this message translates to:
  /// **'Open messages'**
  String get portalMessagesCta;

  /// No description provided for @portalProjectsTitle.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get portalProjectsTitle;

  /// No description provided for @portalProjectsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No active projects yet.'**
  String get portalProjectsEmpty;

  /// No description provided for @portalProjectsCta.
  ///
  /// In en, this message translates to:
  /// **'View projects'**
  String get portalProjectsCta;

  /// No description provided for @portalContentTitle.
  ///
  /// In en, this message translates to:
  /// **'Recent content'**
  String get portalContentTitle;

  /// No description provided for @portalContentEmpty.
  ///
  /// In en, this message translates to:
  /// **'No published or scheduled posts to show yet.'**
  String get portalContentEmpty;

  /// No description provided for @portalContentCta.
  ///
  /// In en, this message translates to:
  /// **'Browse content'**
  String get portalContentCta;

  /// No description provided for @portalKpiFiles.
  ///
  /// In en, this message translates to:
  /// **'Shared files'**
  String get portalKpiFiles;

  /// No description provided for @portalKpiFilesCaption.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing shared yet} =1{1 file} other{{count} files}}'**
  String portalKpiFilesCaption(int count);

  /// No description provided for @portalKpiReports.
  ///
  /// In en, this message translates to:
  /// **'Reach (30 days)'**
  String get portalKpiReports;

  /// No description provided for @portalKpiReportsCaption.
  ///
  /// In en, this message translates to:
  /// **'Across your connected channels'**
  String get portalKpiReportsCaption;

  /// No description provided for @portalFilesTitle.
  ///
  /// In en, this message translates to:
  /// **'Files'**
  String get portalFilesTitle;

  /// No description provided for @portalFilesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No files have been shared with you yet.'**
  String get portalFilesEmpty;

  /// No description provided for @portalFilesCta.
  ///
  /// In en, this message translates to:
  /// **'Browse files'**
  String get portalFilesCta;

  /// No description provided for @portalReportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get portalReportsTitle;

  /// No description provided for @portalReportsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No reports are ready yet.'**
  String get portalReportsEmpty;

  /// No description provided for @portalReportsCta.
  ///
  /// In en, this message translates to:
  /// **'View reports'**
  String get portalReportsCta;

  /// No description provided for @portalContentStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} IN_REVIEW{In review} CHANGES_REQUESTED{Changes requested} APPROVED{Approved} SCHEDULED{Scheduled} PUBLISHED{Published} other{{status}}}'**
  String portalContentStatus(String status);

  /// No description provided for @portalInvoiceStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} SENT{Sent} PAID{Paid} OVERDUE{Overdue} VOID{Void} other{{status}}}'**
  String portalInvoiceStatus(String status);

  /// No description provided for @portalProjectStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PLANNING{Planning} ACTIVE{Active} ON_HOLD{On hold} COMPLETED{Completed} CANCELLED{Cancelled} other{{status}}}'**
  String portalProjectStatus(String status);

  /// No description provided for @portalMessageOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get portalMessageOpen;

  /// No description provided for @portalMessageResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get portalMessageResolved;

  /// No description provided for @portalDue.
  ///
  /// In en, this message translates to:
  /// **'Due {when}'**
  String portalDue(String when);

  /// No description provided for @portalScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled {when}'**
  String portalScheduled(String when);

  /// No description provided for @navProjects.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get navProjects;

  /// No description provided for @projectsTitle.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get projectsTitle;

  /// No description provided for @projectsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search projects'**
  String get projectsSearch;

  /// No description provided for @projectsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No projects yet'**
  String get projectsEmpty;

  /// No description provided for @projectsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Projects group a client\'s tasks, budget and timeline in one place.'**
  String get projectsEmptyBody;

  /// No description provided for @projectNew.
  ///
  /// In en, this message translates to:
  /// **'New project'**
  String get projectNew;

  /// No description provided for @projectEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit project'**
  String get projectEdit;

  /// No description provided for @projectStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PLANNING{Planning} ACTIVE{Active} ON_HOLD{On hold} COMPLETED{Completed} other{{status}}}'**
  String projectStatus(String status);

  /// No description provided for @projectStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get projectStatusLabel;

  /// No description provided for @projectStatusChange.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get projectStatusChange;

  /// No description provided for @projectName.
  ///
  /// In en, this message translates to:
  /// **'Project name'**
  String get projectName;

  /// No description provided for @projectNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Diwali campaign'**
  String get projectNameHint;

  /// No description provided for @projectType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get projectType;

  /// No description provided for @projectTypeHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Campaign, Retainer, Website'**
  String get projectTypeHint;

  /// No description provided for @projectClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get projectClient;

  /// No description provided for @projectClientLocked.
  ///
  /// In en, this message translates to:
  /// **'A project\'s client cannot be changed.'**
  String get projectClientLocked;

  /// No description provided for @projectOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get projectOwner;

  /// No description provided for @projectStartDate.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get projectStartDate;

  /// No description provided for @projectEndDate.
  ///
  /// In en, this message translates to:
  /// **'End date'**
  String get projectEndDate;

  /// No description provided for @projectEndBeforeStart.
  ///
  /// In en, this message translates to:
  /// **'The end date cannot be before the start date.'**
  String get projectEndBeforeStart;

  /// No description provided for @projectBudget.
  ///
  /// In en, this message translates to:
  /// **'Budget'**
  String get projectBudget;

  /// No description provided for @projectBudgetField.
  ///
  /// In en, this message translates to:
  /// **'Budget ({currency})'**
  String projectBudgetField(String currency);

  /// No description provided for @projectBudgetInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount, e.g. 50000'**
  String get projectBudgetInvalid;

  /// No description provided for @projectNoBudget.
  ///
  /// In en, this message translates to:
  /// **'No budget'**
  String get projectNoBudget;

  /// No description provided for @projectCreatedOn.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get projectCreatedOn;

  /// No description provided for @projectTimeline.
  ///
  /// In en, this message translates to:
  /// **'Timeline'**
  String get projectTimeline;

  /// No description provided for @projectNoEnd.
  ///
  /// In en, this message translates to:
  /// **'No end date'**
  String get projectNoEnd;

  /// No description provided for @projectDateRange.
  ///
  /// In en, this message translates to:
  /// **'{start} – {end}'**
  String projectDateRange(String start, String end);

  /// No description provided for @projectProgress.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total, plural, =1{1 task} other{{total} tasks}} done'**
  String projectProgress(int done, int total);

  /// No description provided for @projectProgressLabel.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get projectProgressLabel;

  /// No description provided for @projectNoTasks.
  ///
  /// In en, this message translates to:
  /// **'No tasks yet'**
  String get projectNoTasks;

  /// No description provided for @projectLogged.
  ///
  /// In en, this message translates to:
  /// **'Time logged'**
  String get projectLogged;

  /// No description provided for @projectTasks.
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get projectTasks;

  /// No description provided for @projectTasksEmpty.
  ///
  /// In en, this message translates to:
  /// **'No tasks in this project yet.'**
  String get projectTasksEmpty;

  /// No description provided for @projectAddTask.
  ///
  /// In en, this message translates to:
  /// **'Add task'**
  String get projectAddTask;

  /// No description provided for @projectFacts.
  ///
  /// In en, this message translates to:
  /// **'Key facts'**
  String get projectFacts;

  /// No description provided for @projectContent.
  ///
  /// In en, this message translates to:
  /// **'Client content'**
  String get projectContent;

  /// No description provided for @projectContentEmpty.
  ///
  /// In en, this message translates to:
  /// **'No content for this client yet.'**
  String get projectContentEmpty;

  /// No description provided for @projectContentStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} IN_REVIEW{In review} CHANGES_REQUESTED{Changes requested} APPROVED{Approved} SCHEDULED{Scheduled} PUBLISHED{Published} other{{status}}}'**
  String projectContentStatus(String status);

  /// No description provided for @projectFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get projectFilterClient;

  /// No description provided for @projectOpenClient.
  ///
  /// In en, this message translates to:
  /// **'Open client {name}'**
  String projectOpenClient(String name);

  /// No description provided for @projectOpenTask.
  ///
  /// In en, this message translates to:
  /// **'Open task {title}'**
  String projectOpenTask(String title);

  /// No description provided for @projectNoClients.
  ///
  /// In en, this message translates to:
  /// **'Add a client first — every project belongs to one.'**
  String get projectNoClients;

  /// No description provided for @projectStatAll.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get projectStatAll;

  /// No description provided for @projectStatActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get projectStatActive;

  /// No description provided for @projectStatPlanning.
  ///
  /// In en, this message translates to:
  /// **'Planning'**
  String get projectStatPlanning;

  /// No description provided for @projectStatDone.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get projectStatDone;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @reportsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reportsTitle;

  /// No description provided for @reportsTab.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reportsTab;

  /// No description provided for @reportAnalyticsTab.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get reportAnalyticsTab;

  /// No description provided for @reportNew.
  ///
  /// In en, this message translates to:
  /// **'New report'**
  String get reportNew;

  /// No description provided for @reportEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit report'**
  String get reportEdit;

  /// No description provided for @reportsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search by title or client'**
  String get reportsSearch;

  /// No description provided for @reportsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No reports yet'**
  String get reportsEmpty;

  /// No description provided for @reportsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create a report to share a period\'s results with a client.'**
  String get reportsEmptyBody;

  /// No description provided for @reportsEmptyPortalBody.
  ///
  /// In en, this message translates to:
  /// **'Reports your agency shares with you will appear here.'**
  String get reportsEmptyPortalBody;

  /// No description provided for @reportClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get reportClient;

  /// No description provided for @reportClientUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown client'**
  String get reportClientUnknown;

  /// No description provided for @reportStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get reportStatusLabel;

  /// No description provided for @reportStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} READY{Ready} SENT{Sent} other{Unknown}}'**
  String reportStatus(String status);

  /// No description provided for @reportStatusHint.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Still being prepared. Mark it ready once the figures are final.} READY{Final and ready to share. Send it, or move it back to draft to keep editing.} SENT{Shared with the client.} other{Status unknown.}}'**
  String reportStatusHint(String status);

  /// No description provided for @reportTransitionAction.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Back to draft} READY{Mark ready} SENT{Mark sent} other{Update}}'**
  String reportTransitionAction(String status);

  /// No description provided for @reportTransitionDone.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Moved back to draft} READY{Marked ready} SENT{Marked as sent} other{Status updated}}'**
  String reportTransitionDone(String status);

  /// No description provided for @reportSendConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Mark “{title}” as sent?'**
  String reportSendConfirmTitle(String title);

  /// No description provided for @reportSendConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Sent reports can no longer change status.'**
  String get reportSendConfirmBody;

  /// No description provided for @reportStepSemantics.
  ///
  /// In en, this message translates to:
  /// **'Step {step} of {total}: {status}'**
  String reportStepSemantics(int step, int total, String status);

  /// No description provided for @reportPeriod.
  ///
  /// In en, this message translates to:
  /// **'Period'**
  String get reportPeriod;

  /// No description provided for @reportPeriodRange.
  ///
  /// In en, this message translates to:
  /// **'{start} – {end}'**
  String reportPeriodRange(String start, String end);

  /// No description provided for @reportPeriodStart.
  ///
  /// In en, this message translates to:
  /// **'Period start'**
  String get reportPeriodStart;

  /// No description provided for @reportPeriodEnd.
  ///
  /// In en, this message translates to:
  /// **'Period end'**
  String get reportPeriodEnd;

  /// No description provided for @reportCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get reportCreated;

  /// No description provided for @reportTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get reportTitleLabel;

  /// No description provided for @reportSummary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get reportSummary;

  /// No description provided for @reportNoSummary.
  ///
  /// In en, this message translates to:
  /// **'No summary yet'**
  String get reportNoSummary;

  /// No description provided for @reportCardSemantics.
  ///
  /// In en, this message translates to:
  /// **'{title}, {client}, {status}, {period}'**
  String reportCardSemantics(
    String title,
    String client,
    String status,
    String period,
  );

  /// No description provided for @reportSnapshot.
  ///
  /// In en, this message translates to:
  /// **'Contents'**
  String get reportSnapshot;

  /// No description provided for @reportSnapshotEmpty.
  ///
  /// In en, this message translates to:
  /// **'This report has no figures yet.'**
  String get reportSnapshotEmpty;

  /// No description provided for @reportHighlights.
  ///
  /// In en, this message translates to:
  /// **'Highlights'**
  String get reportHighlights;

  /// No description provided for @reportDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get reportDetails;

  /// No description provided for @reportYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get reportYes;

  /// No description provided for @reportNo.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get reportNo;

  /// No description provided for @reportMetricName.
  ///
  /// In en, this message translates to:
  /// **'{metric, select, reach{Reach} engagement{Engagement} followers{Followers} impressions{Impressions} other{{fallback}}}'**
  String reportMetricName(String metric, String fallback);

  /// No description provided for @reportRangeDays.
  ///
  /// In en, this message translates to:
  /// **'{days}d'**
  String reportRangeDays(int days);

  /// No description provided for @reportRangeTooltip.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{Last day} other{Last {days} days}}'**
  String reportRangeTooltip(int days);

  /// No description provided for @reportAnalyticsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No analytics yet'**
  String get reportAnalyticsEmpty;

  /// No description provided for @reportAnalyticsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{No metrics were recorded in the last day.} other{No metrics were recorded in the last {days} days.}} Connect social accounts to start collecting them.'**
  String reportAnalyticsEmptyBody(int days);

  /// No description provided for @reportChange.
  ///
  /// In en, this message translates to:
  /// **'{direction, select, up{▲ {percent}} down{▼ {percent}} other{{percent}}} vs previous {days} days'**
  String reportChange(String percent, String direction, int days);

  /// No description provided for @reportNoComparison.
  ///
  /// In en, this message translates to:
  /// **'No earlier data to compare'**
  String get reportNoComparison;

  /// No description provided for @reportLatest.
  ///
  /// In en, this message translates to:
  /// **'Latest {value}'**
  String reportLatest(String value);

  /// No description provided for @reportTotal.
  ///
  /// In en, this message translates to:
  /// **'Total {value}'**
  String reportTotal(String value);

  /// No description provided for @reportChartSemantics.
  ///
  /// In en, this message translates to:
  /// **'{metric} over the last {days} days: total {total}, daily peak {peak}'**
  String reportChartSemantics(
    String metric,
    int days,
    String total,
    String peak,
  );

  /// No description provided for @navRoles.
  ///
  /// In en, this message translates to:
  /// **'Roles & permissions'**
  String get navRoles;

  /// No description provided for @rolesTitle.
  ///
  /// In en, this message translates to:
  /// **'Roles & permissions'**
  String get rolesTitle;

  /// No description provided for @rolesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Define what each role can see and do. Members can hold several roles; their access is the sum of them.'**
  String get rolesSubtitle;

  /// No description provided for @rolesSearch.
  ///
  /// In en, this message translates to:
  /// **'Search roles'**
  String get rolesSearch;

  /// No description provided for @rolesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No roles yet'**
  String get rolesEmpty;

  /// No description provided for @rolesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create a custom role to give people exactly the access they need.'**
  String get rolesEmptyBody;

  /// No description provided for @roleNew.
  ///
  /// In en, this message translates to:
  /// **'New role'**
  String get roleNew;

  /// No description provided for @roleEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit role'**
  String get roleEdit;

  /// No description provided for @roleCreate.
  ///
  /// In en, this message translates to:
  /// **'Create role'**
  String get roleCreate;

  /// No description provided for @roleDuplicate.
  ///
  /// In en, this message translates to:
  /// **'Duplicate as custom role'**
  String get roleDuplicate;

  /// No description provided for @roleDuplicateName.
  ///
  /// In en, this message translates to:
  /// **'{name} (copy)'**
  String roleDuplicateName(String name);

  /// No description provided for @roleDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete role'**
  String get roleDelete;

  /// No description provided for @roleKind.
  ///
  /// In en, this message translates to:
  /// **'{kind, select, system{System} custom{Custom} other{{kind}}}'**
  String roleKind(String kind);

  /// No description provided for @roleMembers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No members} =1{1 member} other{{count} members}}'**
  String roleMembers(int count);

  /// No description provided for @rolePermissionCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No permissions} =1{1 permission} other{{count} permissions}}'**
  String rolePermissionCount(int count);

  /// No description provided for @roleNoDescription.
  ///
  /// In en, this message translates to:
  /// **'No description'**
  String get roleNoDescription;

  /// No description provided for @roleName.
  ///
  /// In en, this message translates to:
  /// **'Role name'**
  String get roleName;

  /// No description provided for @roleNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Senior strategist'**
  String get roleNameHint;

  /// No description provided for @roleDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get roleDescription;

  /// No description provided for @roleDescriptionHint.
  ///
  /// In en, this message translates to:
  /// **'What is this role for?'**
  String get roleDescriptionHint;

  /// No description provided for @rolePermissions.
  ///
  /// In en, this message translates to:
  /// **'Permissions'**
  String get rolePermissions;

  /// No description provided for @rolePermissionsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search permissions'**
  String get rolePermissionsSearch;

  /// No description provided for @rolePermissionsSelected.
  ///
  /// In en, this message translates to:
  /// **'{selected} of {total} permissions selected'**
  String rolePermissionsSelected(int selected, int total);

  /// No description provided for @roleGroupCount.
  ///
  /// In en, this message translates to:
  /// **'{selected}/{total}'**
  String roleGroupCount(int selected, int total);

  /// No description provided for @roleGroupToggle.
  ///
  /// In en, this message translates to:
  /// **'Grant every {group} permission'**
  String roleGroupToggle(String group);

  /// No description provided for @roleAssignedTo.
  ///
  /// In en, this message translates to:
  /// **'Assigned to'**
  String get roleAssignedTo;

  /// No description provided for @roleExpandAll.
  ///
  /// In en, this message translates to:
  /// **'Expand all'**
  String get roleExpandAll;

  /// No description provided for @roleCollapseAll.
  ///
  /// In en, this message translates to:
  /// **'Collapse all'**
  String get roleCollapseAll;

  /// No description provided for @rolePermissionsNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No permissions match your search.'**
  String get rolePermissionsNoMatch;

  /// No description provided for @rolePermissionsRequired.
  ///
  /// In en, this message translates to:
  /// **'Select at least one permission.'**
  String get rolePermissionsRequired;

  /// No description provided for @rolePermissionsMore.
  ///
  /// In en, this message translates to:
  /// **'+{count} more'**
  String rolePermissionsMore(int count);

  /// No description provided for @roleSystemReadOnly.
  ///
  /// In en, this message translates to:
  /// **'System roles are read-only. Duplicate this role to grant a different set of permissions.'**
  String get roleSystemReadOnly;

  /// No description provided for @roleUnsavedTitle.
  ///
  /// In en, this message translates to:
  /// **'Discard changes?'**
  String get roleUnsavedTitle;

  /// No description provided for @roleUnsavedBody.
  ///
  /// In en, this message translates to:
  /// **'Your edits to this role have not been saved.'**
  String get roleUnsavedBody;

  /// No description provided for @roleDiscard.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get roleDiscard;

  /// No description provided for @roleInUse.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 member still holds this role. Reassign them before deleting it.} other{{count} members still hold this role. Reassign them before deleting it.}}'**
  String roleInUse(int count);

  /// No description provided for @roleStatRoles.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get roleStatRoles;

  /// No description provided for @roleStatCustom.
  ///
  /// In en, this message translates to:
  /// **'Custom roles'**
  String get roleStatCustom;

  /// No description provided for @roleStatPermissions.
  ///
  /// In en, this message translates to:
  /// **'Permissions available'**
  String get roleStatPermissions;

  /// No description provided for @rolePermissionGroup.
  ///
  /// In en, this message translates to:
  /// **'{group, select, k_org{Organization} k_members{Members} k_roles{Roles} k_workspaces{Workspaces} k_clients{Clients} k_leads{Leads} k_projects{Projects} k_tasks{Tasks} k_content{Content} k_social{Social publishing} k_approvals{Approvals} k_feedback{Feedback} k_files{Files} k_inbox{Inbox} k_workflows{Workflows} k_automations{Automations} k_reports{Reports} k_invoices{Invoices} k_time{Time tracking} k_audit{Audit log} k_integrations{Integrations} other{{fallback}}}'**
  String rolePermissionGroup(String group, String fallback);

  /// No description provided for @rolePermissionAction.
  ///
  /// In en, this message translates to:
  /// **'{action, select, k_view{View} k_create{Create} k_edit{Edit} k_delete{Delete} k_invite{Invite} k_deactivate{Deactivate} k_manage{Manage} k_settings_manage{Manage settings} k_billing_manage{Manage billing} k_branding_manage{Manage branding} k_convert{Convert} k_assign{Assign} k_transition{Change status} k_schedule{Schedule} k_publish{Publish} k_approve{Approve} k_resolve{Resolve} k_upload{Upload} k_reply{Reply} k_track{Track} other{{fallback}}}'**
  String rolePermissionAction(String action, String fallback);

  /// No description provided for @rolePermissionLabel.
  ///
  /// In en, this message translates to:
  /// **'{group} · {action}'**
  String rolePermissionLabel(String group, String action);

  /// No description provided for @navSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get navSearch;

  /// No description provided for @searchTitle.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get searchTitle;

  /// No description provided for @searchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Search clients, projects, tasks…'**
  String get searchPlaceholder;

  /// No description provided for @searchMinChars.
  ///
  /// In en, this message translates to:
  /// **'Type at least {count} characters to search'**
  String searchMinChars(int count);

  /// No description provided for @searchEmpty.
  ///
  /// In en, this message translates to:
  /// **'No results'**
  String get searchEmpty;

  /// No description provided for @searchEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing matched “{query}”. Try a different name or keyword.'**
  String searchEmptyBody(String query);

  /// No description provided for @searchIdleTitle.
  ///
  /// In en, this message translates to:
  /// **'Search the workspace'**
  String get searchIdleTitle;

  /// No description provided for @searchIdleBody.
  ///
  /// In en, this message translates to:
  /// **'Find clients, projects, tasks, leads and content in one place.'**
  String get searchIdleBody;

  /// No description provided for @searchResultsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 result} other{{count} results}}'**
  String searchResultsCount(int count);

  /// No description provided for @searchGroupCount.
  ///
  /// In en, this message translates to:
  /// **'{count}'**
  String searchGroupCount(int count);

  /// No description provided for @searchGroupClients.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get searchGroupClients;

  /// No description provided for @searchGroupProjects.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get searchGroupProjects;

  /// No description provided for @searchGroupTasks.
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get searchGroupTasks;

  /// No description provided for @searchGroupLeads.
  ///
  /// In en, this message translates to:
  /// **'Leads'**
  String get searchGroupLeads;

  /// No description provided for @searchGroupContent.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get searchGroupContent;

  /// No description provided for @searchGroupInvoices.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get searchGroupInvoices;

  /// No description provided for @searchGroupApprovals.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get searchGroupApprovals;

  /// No description provided for @searchResultAria.
  ///
  /// In en, this message translates to:
  /// **'{type}: {title}'**
  String searchResultAria(String type, String title);

  /// No description provided for @searchStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, ONBOARDING{Onboarding} ACTIVE{Active} PAUSED{Paused} CHURNED{Churned} PLANNING{Planning} ON_HOLD{On hold} COMPLETED{Completed} TODO{To do} IN_PROGRESS{In progress} IN_REVIEW{In review} DONE{Done} DRAFT{Draft} CHANGES_REQUESTED{Changes requested} APPROVED{Approved} SCHEDULED{Scheduled} PUBLISHED{Published} other{{status}}}'**
  String searchStatus(String status);

  /// No description provided for @navTasks.
  ///
  /// In en, this message translates to:
  /// **'To-do'**
  String get navTasks;

  /// No description provided for @tasksTitle.
  ///
  /// In en, this message translates to:
  /// **'To-do'**
  String get tasksTitle;

  /// No description provided for @tasksSearch.
  ///
  /// In en, this message translates to:
  /// **'Search tasks'**
  String get tasksSearch;

  /// No description provided for @tasksEmpty.
  ///
  /// In en, this message translates to:
  /// **'No tasks yet'**
  String get tasksEmpty;

  /// No description provided for @tasksEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create a task to plan, assign and track work for your clients.'**
  String get tasksEmptyBody;

  /// No description provided for @taskNew.
  ///
  /// In en, this message translates to:
  /// **'New task'**
  String get taskNew;

  /// No description provided for @taskEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit task'**
  String get taskEdit;

  /// No description provided for @taskDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete task'**
  String get taskDelete;

  /// No description provided for @taskViewBoard.
  ///
  /// In en, this message translates to:
  /// **'Board'**
  String get taskViewBoard;

  /// No description provided for @taskViewList.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get taskViewList;

  /// No description provided for @taskScope.
  ///
  /// In en, this message translates to:
  /// **'{scope, select, mine{Mine} unassigned{Unassigned} overdue{Overdue} other{{scope}}}'**
  String taskScope(String scope);

  /// No description provided for @taskStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, TODO{To do} IN_PROGRESS{In progress} IN_REVIEW{In review} DONE{Done} other{{status}}}'**
  String taskStatus(String status);

  /// No description provided for @taskPriority.
  ///
  /// In en, this message translates to:
  /// **'{priority, select, LOW{Low} MEDIUM{Medium} HIGH{High} URGENT{Urgent} other{{priority}}}'**
  String taskPriority(String priority);

  /// No description provided for @taskFilterPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get taskFilterPriority;

  /// No description provided for @taskFilterProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get taskFilterProject;

  /// No description provided for @taskFilterClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get taskFilterClient;

  /// No description provided for @taskFilterStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get taskFilterStatus;

  /// No description provided for @taskFiltersClear.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get taskFiltersClear;

  /// No description provided for @taskColumnCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No tasks} =1{1 task} other{{count} tasks}}'**
  String taskColumnCount(int count);

  /// No description provided for @taskColumnSemantics.
  ///
  /// In en, this message translates to:
  /// **'{status}: {count, plural, =0{no tasks} =1{1 task} other{{count} tasks}}'**
  String taskColumnSemantics(String status, int count);

  /// No description provided for @taskColumnEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet'**
  String get taskColumnEmpty;

  /// No description provided for @taskColumnDrop.
  ///
  /// In en, this message translates to:
  /// **'Drop to move here'**
  String get taskColumnDrop;

  /// No description provided for @taskDragHint.
  ///
  /// In en, this message translates to:
  /// **'Long-press a card and drag it to another column to change its status.'**
  String get taskDragHint;

  /// No description provided for @taskMovedToast.
  ///
  /// In en, this message translates to:
  /// **'Moved to {status}'**
  String taskMovedToast(String status);

  /// No description provided for @taskStatusChange.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get taskStatusChange;

  /// No description provided for @taskStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get taskStatusLabel;

  /// No description provided for @taskPriorityLabel.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get taskPriorityLabel;

  /// No description provided for @taskPriorityChange.
  ///
  /// In en, this message translates to:
  /// **'Change priority'**
  String get taskPriorityChange;

  /// No description provided for @taskTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get taskTitleLabel;

  /// No description provided for @taskTitleHint.
  ///
  /// In en, this message translates to:
  /// **'What needs to be done?'**
  String get taskTitleHint;

  /// No description provided for @taskDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get taskDescription;

  /// No description provided for @taskDescriptionEmpty.
  ///
  /// In en, this message translates to:
  /// **'No description yet.'**
  String get taskDescriptionEmpty;

  /// No description provided for @taskProject.
  ///
  /// In en, this message translates to:
  /// **'Project (optional)'**
  String get taskProject;

  /// No description provided for @taskProjectWithClient.
  ///
  /// In en, this message translates to:
  /// **'{client} · {project}'**
  String taskProjectWithClient(String client, String project);

  /// No description provided for @taskInbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox (no project)'**
  String get taskInbox;

  /// No description provided for @taskClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get taskClient;

  /// No description provided for @taskAssignee.
  ///
  /// In en, this message translates to:
  /// **'Assignees'**
  String get taskAssignee;

  /// No description provided for @taskAssigneeChange.
  ///
  /// In en, this message translates to:
  /// **'Change assignees'**
  String get taskAssigneeChange;

  /// No description provided for @taskAssigneesDone.
  ///
  /// In en, this message translates to:
  /// **'Save assignees'**
  String get taskAssigneesDone;

  /// No description provided for @taskAssignedTo.
  ///
  /// In en, this message translates to:
  /// **'Assigned to {name}'**
  String taskAssignedTo(String name);

  /// No description provided for @taskAssignedToMany.
  ///
  /// In en, this message translates to:
  /// **'Assigned to {count} people'**
  String taskAssignedToMany(int count);

  /// No description provided for @taskDueDate.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get taskDueDate;

  /// No description provided for @taskEstimate.
  ///
  /// In en, this message translates to:
  /// **'Estimate'**
  String get taskEstimate;

  /// No description provided for @taskEstimateHours.
  ///
  /// In en, this message translates to:
  /// **'Estimate (hours)'**
  String get taskEstimateHours;

  /// No description provided for @taskEstimateHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 1.5'**
  String get taskEstimateHint;

  /// No description provided for @taskEstimateInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a number of hours, e.g. 1.5'**
  String get taskEstimateInvalid;

  /// No description provided for @taskCreatedOn.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get taskCreatedOn;

  /// No description provided for @taskOpenProject.
  ///
  /// In en, this message translates to:
  /// **'Open project {name}'**
  String taskOpenProject(String name);

  /// No description provided for @taskOpenClient.
  ///
  /// In en, this message translates to:
  /// **'Open client {name}'**
  String taskOpenClient(String name);

  /// No description provided for @taskNoProjects.
  ///
  /// In en, this message translates to:
  /// **'No projects yet — you can still create an inbox task.'**
  String get taskNoProjects;

  /// No description provided for @navTeam.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get navTeam;

  /// No description provided for @teamTabMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get teamTabMembers;

  /// No description provided for @teamTabInvitations.
  ///
  /// In en, this message translates to:
  /// **'Invitations'**
  String get teamTabInvitations;

  /// No description provided for @teamSearch.
  ///
  /// In en, this message translates to:
  /// **'Search people, emails or roles'**
  String get teamSearch;

  /// No description provided for @teamFilterByRole.
  ///
  /// In en, this message translates to:
  /// **'Filter by role'**
  String get teamFilterByRole;

  /// No description provided for @teamEmpty.
  ///
  /// In en, this message translates to:
  /// **'No one here yet'**
  String get teamEmpty;

  /// No description provided for @teamEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Invite teammates and clients to start working together.'**
  String get teamEmptyBody;

  /// No description provided for @teamYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get teamYou;

  /// No description provided for @teamEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get teamEmail;

  /// No description provided for @teamEmailHint.
  ///
  /// In en, this message translates to:
  /// **'name@agency.com'**
  String get teamEmailHint;

  /// No description provided for @teamEmailCopied.
  ///
  /// In en, this message translates to:
  /// **'Email copied'**
  String get teamEmailCopied;

  /// No description provided for @teamJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get teamJoined;

  /// No description provided for @teamType.
  ///
  /// In en, this message translates to:
  /// **'Access level'**
  String get teamType;

  /// No description provided for @teamMembershipType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, OWNER{Owner} ADMIN{Admin} MEMBER{Member} CLIENT{Client} other{{type}}}'**
  String teamMembershipType(String type);

  /// No description provided for @teamMembershipTypeHint.
  ///
  /// In en, this message translates to:
  /// **'{type, select, OWNER{Owns the workspace, including billing and every permission.} ADMIN{Default admin permissions for clients, projects and the team. Assign custom roles for finer control.} MEMBER{Default member permissions for tasks and content. Assign custom roles for finer control.} CLIENT{Client — sees only their own content, approvals, files and invoices in the portal.} other{{type}}}'**
  String teamMembershipTypeHint(String type);

  /// No description provided for @teamMemberStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, ACTIVE{Active} INVITED{Invited} DEACTIVATED{Deactivated} other{{status}}}'**
  String teamMemberStatus(String status);

  /// No description provided for @teamRoles.
  ///
  /// In en, this message translates to:
  /// **'Roles'**
  String get teamRoles;

  /// No description provided for @teamRolesNone.
  ///
  /// In en, this message translates to:
  /// **'No roles assigned.'**
  String get teamRolesNone;

  /// No description provided for @teamRolesEdit.
  ///
  /// In en, this message translates to:
  /// **'Roles for {name}'**
  String teamRolesEdit(String name);

  /// No description provided for @teamRolesRequired.
  ///
  /// In en, this message translates to:
  /// **'Pick at least one role.'**
  String get teamRolesRequired;

  /// No description provided for @teamRolesMax.
  ///
  /// In en, this message translates to:
  /// **'Pick up to {max} roles.'**
  String teamRolesMax(int max);

  /// No description provided for @teamRolesCount.
  ///
  /// In en, this message translates to:
  /// **'{selected} of {max}'**
  String teamRolesCount(int selected, int max);

  /// No description provided for @teamRolesHint.
  ///
  /// In en, this message translates to:
  /// **'Access is the sum of every role selected. Build custom roles in Roles & permissions.'**
  String get teamRolesHint;

  /// No description provided for @teamRolesHintNoCustom.
  ///
  /// In en, this message translates to:
  /// **'Only system roles exist so far. Create custom roles in Roles & permissions for finer control.'**
  String get teamRolesHintNoCustom;

  /// No description provided for @teamTypeChange.
  ///
  /// In en, this message translates to:
  /// **'Change access level'**
  String get teamTypeChange;

  /// No description provided for @teamTypeChangeNotice.
  ///
  /// In en, this message translates to:
  /// **'Switching access level replaces their system role with the default role for the new level. Custom roles stay assigned.'**
  String get teamTypeChangeNotice;

  /// No description provided for @teamProtected.
  ///
  /// In en, this message translates to:
  /// **'{reason, select, self{You cannot change your own membership. Ask another admin.} owner{The owner\'s membership cannot be changed here.} client{Client portal access is managed from the client\'s invitations.} other{This membership cannot be changed here.}}'**
  String teamProtected(String reason);

  /// No description provided for @teamDeactivate.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get teamDeactivate;

  /// No description provided for @teamDeactivateTitle.
  ///
  /// In en, this message translates to:
  /// **'Deactivate {name}?'**
  String teamDeactivateTitle(String name);

  /// No description provided for @teamDeactivateBody.
  ///
  /// In en, this message translates to:
  /// **'They lose access to this workspace immediately and every role they hold is removed. You can invite them again later.'**
  String get teamDeactivateBody;

  /// No description provided for @teamDeactivated.
  ///
  /// In en, this message translates to:
  /// **'{name} was deactivated'**
  String teamDeactivated(String name);

  /// No description provided for @teamInvite.
  ///
  /// In en, this message translates to:
  /// **'Invite'**
  String get teamInvite;

  /// No description provided for @teamInviteSend.
  ///
  /// In en, this message translates to:
  /// **'Send invite'**
  String get teamInviteSend;

  /// No description provided for @teamInviteBody.
  ///
  /// In en, this message translates to:
  /// **'They get an email with a link to join. You can change their access any time.'**
  String get teamInviteBody;

  /// No description provided for @teamClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get teamClient;

  /// No description provided for @teamClientRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose the client this person belongs to.'**
  String get teamClientRequired;

  /// No description provided for @teamClientNone.
  ///
  /// In en, this message translates to:
  /// **'No clients are available to you. Portal invitations need a client you can view.'**
  String get teamClientNone;

  /// No description provided for @teamClientUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Clients could not be loaded. Try again in a moment.'**
  String get teamClientUnavailable;

  /// No description provided for @teamInviteDefaultRole.
  ///
  /// In en, this message translates to:
  /// **'Leave roles empty to give the default role for the access level.'**
  String get teamInviteDefaultRole;

  /// No description provided for @teamInviteExpiry.
  ///
  /// In en, this message translates to:
  /// **'Link expires after'**
  String get teamInviteExpiry;

  /// No description provided for @teamInviteExpiryDays.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{1 day} other{{days} days}}'**
  String teamInviteExpiryDays(int days);

  /// No description provided for @teamInviteSent.
  ///
  /// In en, this message translates to:
  /// **'Invitation sent'**
  String get teamInviteSent;

  /// No description provided for @teamInviteSentBody.
  ///
  /// In en, this message translates to:
  /// **'We emailed {email} a link to join. You can also share it yourself.'**
  String teamInviteSentBody(String email);

  /// No description provided for @teamInviteExpires.
  ///
  /// In en, this message translates to:
  /// **'Link expires {date}'**
  String teamInviteExpires(String date);

  /// No description provided for @teamCopyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy link'**
  String get teamCopyLink;

  /// No description provided for @teamLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Invite link copied'**
  String get teamLinkCopied;

  /// No description provided for @teamCopyMessage.
  ///
  /// In en, this message translates to:
  /// **'Copy invitation message'**
  String get teamCopyMessage;

  /// No description provided for @teamMessageCopied.
  ///
  /// In en, this message translates to:
  /// **'Invitation message copied'**
  String get teamMessageCopied;

  /// No description provided for @teamInviteShareText.
  ///
  /// In en, this message translates to:
  /// **'You\'re invited to join our workspace on WhizSuite. Accept here: {url}'**
  String teamInviteShareText(String url);

  /// No description provided for @teamInvitationsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search invitations'**
  String get teamInvitationsSearch;

  /// No description provided for @teamInvitationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No invitations'**
  String get teamInvitationsEmpty;

  /// No description provided for @teamInvitationsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Invitations you send appear here until they are accepted.'**
  String get teamInvitationsEmptyBody;

  /// No description provided for @teamInvitationStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, PENDING{Pending} ACCEPTED{Accepted} REVOKED{Revoked} EXPIRED{Expired} other{{status}}}'**
  String teamInvitationStatus(String status);

  /// No description provided for @teamInviteAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted {when}'**
  String teamInviteAccepted(String when);

  /// No description provided for @teamInviteExpiresIn.
  ///
  /// In en, this message translates to:
  /// **'Expires {when}'**
  String teamInviteExpiresIn(String when);

  /// No description provided for @teamInviteExpiredAgo.
  ///
  /// In en, this message translates to:
  /// **'Expired {when}'**
  String teamInviteExpiredAgo(String when);

  /// No description provided for @teamRevoke.
  ///
  /// In en, this message translates to:
  /// **'Revoke invite'**
  String get teamRevoke;

  /// No description provided for @teamRevokeTitle.
  ///
  /// In en, this message translates to:
  /// **'Revoke the invite for {email}?'**
  String teamRevokeTitle(String email);

  /// No description provided for @teamRevokeBody.
  ///
  /// In en, this message translates to:
  /// **'The link stops working straight away. You can send a new invite later.'**
  String get teamRevokeBody;

  /// No description provided for @teamRevoked.
  ///
  /// In en, this message translates to:
  /// **'Invitation revoked'**
  String get teamRevoked;

  /// No description provided for @teamStatMembers.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get teamStatMembers;

  /// No description provided for @teamStatStaff.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get teamStatStaff;

  /// No description provided for @teamStatClients.
  ///
  /// In en, this message translates to:
  /// **'Clients'**
  String get teamStatClients;

  /// No description provided for @navTemplates.
  ///
  /// In en, this message translates to:
  /// **'Templates'**
  String get navTemplates;

  /// No description provided for @templatesTitle.
  ///
  /// In en, this message translates to:
  /// **'Templates'**
  String get templatesTitle;

  /// No description provided for @templatesSearch.
  ///
  /// In en, this message translates to:
  /// **'Search templates'**
  String get templatesSearch;

  /// No description provided for @templatesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No templates yet'**
  String get templatesEmpty;

  /// No description provided for @templatesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Save your best projects, checklists and messages as templates so every new one starts right.'**
  String get templatesEmptyBody;

  /// No description provided for @templateNew.
  ///
  /// In en, this message translates to:
  /// **'New template'**
  String get templateNew;

  /// No description provided for @templateEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit template'**
  String get templateEdit;

  /// No description provided for @templateName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get templateName;

  /// No description provided for @templateNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Monthly social retainer kickoff'**
  String get templateNameHint;

  /// No description provided for @templateType.
  ///
  /// In en, this message translates to:
  /// **'{type, select, PROJECT{Project} TASK{Task} CONTENT{Content} REPORT{Report} MESSAGE{Message} other{{type}}}'**
  String templateType(String type);

  /// No description provided for @templateScope.
  ///
  /// In en, this message translates to:
  /// **'{scope, select, ORGANIZATION{Whole agency} CLIENT{One client} other{{scope}}}'**
  String templateScope(String scope);

  /// No description provided for @templateItems.
  ///
  /// In en, this message translates to:
  /// **'{type, select, PROJECT{Tasks} TASK{Checklist} CONTENT{Sections} REPORT{Sections} MESSAGE{Talking points} other{Items}}'**
  String templateItems(String type);

  /// No description provided for @templateTypeField.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get templateTypeField;

  /// No description provided for @templateScopeField.
  ///
  /// In en, this message translates to:
  /// **'Available to'**
  String get templateScopeField;

  /// No description provided for @templateClientField.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get templateClientField;

  /// No description provided for @templateDescriptionField.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get templateDescriptionField;

  /// No description provided for @templateBodyField.
  ///
  /// In en, this message translates to:
  /// **'Body'**
  String get templateBodyField;

  /// No description provided for @templateBodyHint.
  ///
  /// In en, this message translates to:
  /// **'Default text new items start with, such as a brief or message.'**
  String get templateBodyHint;

  /// No description provided for @templateVersionField.
  ///
  /// In en, this message translates to:
  /// **'Version'**
  String get templateVersionField;

  /// No description provided for @templateCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get templateCreated;

  /// No description provided for @templateNoDescription.
  ///
  /// In en, this message translates to:
  /// **'No description'**
  String get templateNoDescription;

  /// No description provided for @templateNoItems.
  ///
  /// In en, this message translates to:
  /// **'Nothing added yet.'**
  String get templateNoItems;

  /// No description provided for @templateOtherFields.
  ///
  /// In en, this message translates to:
  /// **'Other fields'**
  String get templateOtherFields;

  /// No description provided for @templateItemCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String templateItemCount(int count);

  /// No description provided for @templateVersion.
  ///
  /// In en, this message translates to:
  /// **'v{version}'**
  String templateVersion(int version);

  /// No description provided for @templateStatAll.
  ///
  /// In en, this message translates to:
  /// **'Templates'**
  String get templateStatAll;

  /// No description provided for @templateStatOrg.
  ///
  /// In en, this message translates to:
  /// **'Agency-wide'**
  String get templateStatOrg;

  /// No description provided for @templateStatClient.
  ///
  /// In en, this message translates to:
  /// **'Client-scoped'**
  String get templateStatClient;

  /// No description provided for @templateCreatedOn.
  ///
  /// In en, this message translates to:
  /// **'Created {when}'**
  String templateCreatedOn(String when);

  /// No description provided for @navTime.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get navTime;

  /// No description provided for @timeTitle.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get timeTitle;

  /// No description provided for @timeLog.
  ///
  /// In en, this message translates to:
  /// **'Log time'**
  String get timeLog;

  /// No description provided for @timeLogged.
  ///
  /// In en, this message translates to:
  /// **'Time logged'**
  String get timeLogged;

  /// No description provided for @timeDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this time entry?'**
  String get timeDeleteTitle;

  /// No description provided for @timeScopeMine.
  ///
  /// In en, this message translates to:
  /// **'My time'**
  String get timeScopeMine;

  /// No description provided for @timeScopeTeam.
  ///
  /// In en, this message translates to:
  /// **'Team'**
  String get timeScopeTeam;

  /// No description provided for @timeEntries.
  ///
  /// In en, this message translates to:
  /// **'Entries'**
  String get timeEntries;

  /// No description provided for @timeEntryCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No entries} =1{1 entry} other{{count} entries}}'**
  String timeEntryCount(int count);

  /// No description provided for @timeEntriesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No time tracked this week'**
  String get timeEntriesEmpty;

  /// No description provided for @timeEntriesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Start the timer on a task or log time you have already spent.'**
  String get timeEntriesEmptyBody;

  /// No description provided for @timeToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get timeToday;

  /// No description provided for @timeYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get timeYesterday;

  /// No description provided for @timeDaySemantics.
  ///
  /// In en, this message translates to:
  /// **'{day}, {dayDate}: {total} tracked'**
  String timeDaySemantics(String day, String dayDate, String total);

  /// No description provided for @timeTimerTitle.
  ///
  /// In en, this message translates to:
  /// **'Timer'**
  String get timeTimerTitle;

  /// No description provided for @timeTimerIdle.
  ///
  /// In en, this message translates to:
  /// **'Pick a task and start tracking.'**
  String get timeTimerIdle;

  /// No description provided for @timeTimerLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load your timer.'**
  String get timeTimerLoadFailed;

  /// No description provided for @timeTimerRunningUnknown.
  ///
  /// In en, this message translates to:
  /// **'Tracking a task'**
  String get timeTimerRunningUnknown;

  /// No description provided for @timeTimerStartedAt.
  ///
  /// In en, this message translates to:
  /// **'Started at {startedAt}'**
  String timeTimerStartedAt(String startedAt);

  /// No description provided for @timeTimerElapsedSemantics.
  ///
  /// In en, this message translates to:
  /// **'Timer running, {duration} elapsed'**
  String timeTimerElapsedSemantics(String duration);

  /// No description provided for @timeTimerStart.
  ///
  /// In en, this message translates to:
  /// **'Start timer'**
  String get timeTimerStart;

  /// No description provided for @timeTimerStop.
  ///
  /// In en, this message translates to:
  /// **'Stop and save'**
  String get timeTimerStop;

  /// No description provided for @timeTimerStarted.
  ///
  /// In en, this message translates to:
  /// **'Timer started'**
  String get timeTimerStarted;

  /// No description provided for @timeTimerSaved.
  ///
  /// In en, this message translates to:
  /// **'Time saved'**
  String get timeTimerSaved;

  /// No description provided for @timeTimerNoAssignedTasks.
  ///
  /// In en, this message translates to:
  /// **'No open tasks are assigned to you. Pick a project to see all of its tasks.'**
  String get timeTimerNoAssignedTasks;

  /// No description provided for @timeTimerNoProjectTasks.
  ///
  /// In en, this message translates to:
  /// **'This project has no open tasks.'**
  String get timeTimerNoProjectTasks;

  /// No description provided for @timeProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get timeProject;

  /// No description provided for @timeProjectOfClient.
  ///
  /// In en, this message translates to:
  /// **'{project} · {client}'**
  String timeProjectOfClient(String project, String client);

  /// No description provided for @timeNoProject.
  ///
  /// In en, this message translates to:
  /// **'No project'**
  String get timeNoProject;

  /// No description provided for @timeTask.
  ///
  /// In en, this message translates to:
  /// **'Task'**
  String get timeTask;

  /// No description provided for @timeTaskOptional.
  ///
  /// In en, this message translates to:
  /// **'Task (optional)'**
  String get timeTaskOptional;

  /// No description provided for @timeDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get timeDate;

  /// No description provided for @timeHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get timeHours;

  /// No description provided for @timeHoursSuffix.
  ///
  /// In en, this message translates to:
  /// **'h'**
  String get timeHoursSuffix;

  /// No description provided for @timeMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minutes'**
  String get timeMinutes;

  /// No description provided for @timeMinutesSuffix.
  ///
  /// In en, this message translates to:
  /// **'m'**
  String get timeMinutesSuffix;

  /// No description provided for @timeDurationRange.
  ///
  /// In en, this message translates to:
  /// **'Enter between 1 minute and {max} hours'**
  String timeDurationRange(int max);

  /// No description provided for @timeMinutesRange.
  ///
  /// In en, this message translates to:
  /// **'Use 0 to {max} minutes'**
  String timeMinutesRange(int max);

  /// No description provided for @timeNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get timeNote;

  /// No description provided for @timeBillable.
  ///
  /// In en, this message translates to:
  /// **'Billable'**
  String get timeBillable;

  /// No description provided for @timeNonBillable.
  ///
  /// In en, this message translates to:
  /// **'Non-billable'**
  String get timeNonBillable;

  /// No description provided for @timeBillableHint.
  ///
  /// In en, this message translates to:
  /// **'Counts towards client billing'**
  String get timeBillableHint;

  /// No description provided for @timeEntrySemantics.
  ///
  /// In en, this message translates to:
  /// **'{title}, {duration}, {billable}'**
  String timeEntrySemantics(String title, String duration, String billable);

  /// No description provided for @timeWeekRange.
  ///
  /// In en, this message translates to:
  /// **'{start} – {end}'**
  String timeWeekRange(String start, String end);

  /// No description provided for @timeWeekPrevious.
  ///
  /// In en, this message translates to:
  /// **'Previous week'**
  String get timeWeekPrevious;

  /// No description provided for @timeWeekNext.
  ///
  /// In en, this message translates to:
  /// **'Next week'**
  String get timeWeekNext;

  /// No description provided for @timeWeekCurrent.
  ///
  /// In en, this message translates to:
  /// **'Back to this week'**
  String get timeWeekCurrent;

  /// No description provided for @timeWeekTotal.
  ///
  /// In en, this message translates to:
  /// **'Week total'**
  String get timeWeekTotal;

  /// No description provided for @timeWeekChartSemantics.
  ///
  /// In en, this message translates to:
  /// **'Hours per day: {days}'**
  String timeWeekChartSemantics(String days);

  /// No description provided for @navWorkflows.
  ///
  /// In en, this message translates to:
  /// **'Workflows'**
  String get navWorkflows;

  /// No description provided for @workflowsTitle.
  ///
  /// In en, this message translates to:
  /// **'Approval workflows'**
  String get workflowsTitle;

  /// No description provided for @workflowsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search workflows or stages'**
  String get workflowsSearch;

  /// No description provided for @workflowsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No workflows yet'**
  String get workflowsEmpty;

  /// No description provided for @workflowsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create a workflow to standardise how content gets approved, from draft to published.'**
  String get workflowsEmptyBody;

  /// No description provided for @workflowNew.
  ///
  /// In en, this message translates to:
  /// **'New workflow'**
  String get workflowNew;

  /// No description provided for @workflowEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit workflow'**
  String get workflowEdit;

  /// No description provided for @workflowName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get workflowName;

  /// No description provided for @workflowNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Standard content approval'**
  String get workflowNameHint;

  /// No description provided for @workflowActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get workflowActive;

  /// No description provided for @workflowInactive.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get workflowInactive;

  /// No description provided for @workflowClientApproval.
  ///
  /// In en, this message translates to:
  /// **'Client approval'**
  String get workflowClientApproval;

  /// No description provided for @workflowInternalOnly.
  ///
  /// In en, this message translates to:
  /// **'Internal only'**
  String get workflowInternalOnly;

  /// No description provided for @workflowToggle.
  ///
  /// In en, this message translates to:
  /// **'Turn {name} on or off'**
  String workflowToggle(String name);

  /// No description provided for @workflowActivatedToast.
  ///
  /// In en, this message translates to:
  /// **'Workflow activated'**
  String get workflowActivatedToast;

  /// No description provided for @workflowDeactivatedToast.
  ///
  /// In en, this message translates to:
  /// **'Workflow deactivated'**
  String get workflowDeactivatedToast;

  /// No description provided for @workflowStageCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 stage} other{{count} stages}}'**
  String workflowStageCount(int count);

  /// No description provided for @workflowStagesSemantics.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 stage: {stages}} other{{count} stages: {stages}}}'**
  String workflowStagesSemantics(int count, String stages);

  /// No description provided for @workflowSla.
  ///
  /// In en, this message translates to:
  /// **'Respond within {hours}h'**
  String workflowSla(int hours);

  /// No description provided for @workflowNoSla.
  ///
  /// In en, this message translates to:
  /// **'No response time set'**
  String get workflowNoSla;

  /// No description provided for @workflowStagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Stages'**
  String get workflowStagesTitle;

  /// No description provided for @workflowStagesField.
  ///
  /// In en, this message translates to:
  /// **'Stages'**
  String get workflowStagesField;

  /// No description provided for @workflowStagesHint.
  ///
  /// In en, this message translates to:
  /// **'Content moves through the stages in this order. The first is where it starts, the last means done.'**
  String get workflowStagesHint;

  /// No description provided for @workflowStagesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} of {max}'**
  String workflowStagesCount(int count, int max);

  /// No description provided for @workflowStageLabel.
  ///
  /// In en, this message translates to:
  /// **'Stage {number}'**
  String workflowStageLabel(int number);

  /// No description provided for @workflowStageAdd.
  ///
  /// In en, this message translates to:
  /// **'Add stage'**
  String get workflowStageAdd;

  /// No description provided for @workflowStageMoveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get workflowStageMoveUp;

  /// No description provided for @workflowStageMoveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get workflowStageMoveDown;

  /// No description provided for @workflowStageRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove stage {number}'**
  String workflowStageRemove(int number);

  /// No description provided for @workflowStagesTooFew.
  ///
  /// In en, this message translates to:
  /// **'Add at least {min} stage(s)'**
  String workflowStagesTooFew(int min);

  /// No description provided for @workflowStagesTooMany.
  ///
  /// In en, this message translates to:
  /// **'Use at most {max} stages'**
  String workflowStagesTooMany(int max);

  /// No description provided for @workflowStagesBlank.
  ///
  /// In en, this message translates to:
  /// **'Every stage needs a name'**
  String get workflowStagesBlank;

  /// No description provided for @workflowStagesTooLong.
  ///
  /// In en, this message translates to:
  /// **'Keep stage names under {max} characters'**
  String workflowStagesTooLong(int max);

  /// No description provided for @workflowStagesVersionNote.
  ///
  /// In en, this message translates to:
  /// **'Changing the stages publishes a new version. Content already in progress keeps its version.'**
  String get workflowStagesVersionNote;

  /// No description provided for @workflowSlaField.
  ///
  /// In en, this message translates to:
  /// **'Response time'**
  String get workflowSlaField;

  /// No description provided for @workflowSlaHint.
  ///
  /// In en, this message translates to:
  /// **'How long each approval may take. Leave empty for no limit.'**
  String get workflowSlaHint;

  /// No description provided for @workflowSlaSuffix.
  ///
  /// In en, this message translates to:
  /// **'hours'**
  String get workflowSlaSuffix;

  /// No description provided for @workflowSlaInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter whole hours'**
  String get workflowSlaInvalid;

  /// No description provided for @workflowSlaRange.
  ///
  /// In en, this message translates to:
  /// **'Use between 1 and {max} hours'**
  String workflowSlaRange(int max);

  /// No description provided for @workflowClientApprovalField.
  ///
  /// In en, this message translates to:
  /// **'Needs client approval'**
  String get workflowClientApprovalField;

  /// No description provided for @workflowClientApprovalHint.
  ///
  /// In en, this message translates to:
  /// **'The client must approve before publishing.'**
  String get workflowClientApprovalHint;

  /// No description provided for @workflowActiveField.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get workflowActiveField;

  /// No description provided for @workflowActiveHint.
  ///
  /// In en, this message translates to:
  /// **'Inactive workflows are not offered for new content.'**
  String get workflowActiveHint;

  /// No description provided for @workflowApprovalMetric.
  ///
  /// In en, this message translates to:
  /// **'Sign-off'**
  String get workflowApprovalMetric;

  /// No description provided for @workflowVersionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Version'**
  String get workflowVersionsTitle;

  /// No description provided for @workflowNoVersion.
  ///
  /// In en, this message translates to:
  /// **'This workflow has no published version yet.'**
  String get workflowNoVersion;

  /// No description provided for @workflowVersionLabel.
  ///
  /// In en, this message translates to:
  /// **'v{version}'**
  String workflowVersionLabel(int version);

  /// No description provided for @workflowVersionCurrent.
  ///
  /// In en, this message translates to:
  /// **'Current version'**
  String get workflowVersionCurrent;

  /// No description provided for @workflowVersionUnpublished.
  ///
  /// In en, this message translates to:
  /// **'Not published yet'**
  String get workflowVersionUnpublished;

  /// No description provided for @workflowVersionPublishedOn.
  ///
  /// In en, this message translates to:
  /// **'Published {date}'**
  String workflowVersionPublishedOn(String date);

  /// No description provided for @workflowVersionStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, DRAFT{Draft} PUBLISHED{Published} other{{status}}}'**
  String workflowVersionStatus(String status);

  /// No description provided for @workflowVersionPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish version'**
  String get workflowVersionPublish;

  /// No description provided for @workflowVersionPublishedToast.
  ///
  /// In en, this message translates to:
  /// **'Version published'**
  String get workflowVersionPublishedToast;

  /// No description provided for @workflowTransitionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Allowed moves'**
  String get workflowTransitionsTitle;

  /// No description provided for @workflowTransitionsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No moves are defined in this version.'**
  String get workflowTransitionsEmpty;

  /// No description provided for @workflowCheckerTitle.
  ///
  /// In en, this message translates to:
  /// **'Check a move'**
  String get workflowCheckerTitle;

  /// No description provided for @workflowCheckerBody.
  ///
  /// In en, this message translates to:
  /// **'Pick two stages to see whether content can move directly between them.'**
  String get workflowCheckerBody;

  /// No description provided for @workflowCheckerFrom.
  ///
  /// In en, this message translates to:
  /// **'From stage'**
  String get workflowCheckerFrom;

  /// No description provided for @workflowCheckerTo.
  ///
  /// In en, this message translates to:
  /// **'To stage'**
  String get workflowCheckerTo;

  /// No description provided for @workflowCheckerCheck.
  ///
  /// In en, this message translates to:
  /// **'Check'**
  String get workflowCheckerCheck;

  /// No description provided for @workflowCheckerAllowed.
  ///
  /// In en, this message translates to:
  /// **'Allowed'**
  String get workflowCheckerAllowed;

  /// No description provided for @workflowCheckerBlocked.
  ///
  /// In en, this message translates to:
  /// **'Not allowed'**
  String get workflowCheckerBlocked;

  /// No description provided for @workflowEntityType.
  ///
  /// In en, this message translates to:
  /// **'Applies to'**
  String get workflowEntityType;

  /// No description provided for @workflowEntity.
  ///
  /// In en, this message translates to:
  /// **'{entity, select, content{Content} task{Tasks} project{Projects} other{{entity}}}'**
  String workflowEntity(String entity);

  /// No description provided for @workflowCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get workflowCreated;

  /// No description provided for @workflowUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last changed'**
  String get workflowUpdated;

  /// No description provided for @workflowKpiActiveOf.
  ///
  /// In en, this message translates to:
  /// **'{active} of {total}'**
  String workflowKpiActiveOf(int active, int total);

  /// No description provided for @storageTitle.
  ///
  /// In en, this message translates to:
  /// **'Storage used'**
  String get storageTitle;

  /// No description provided for @storageUsedOf.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit}'**
  String storageUsedOf(String used, String limit);

  /// No description provided for @storageUsedUnlimited.
  ///
  /// In en, this message translates to:
  /// **'{used} used'**
  String storageUsedUnlimited(String used);

  /// No description provided for @storageFileCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 file} other{{count} files}}'**
  String storageFileCount(int count);

  /// No description provided for @storageSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Storage'**
  String get storageSettingsTitle;

  /// No description provided for @storageSettingsBody.
  ///
  /// In en, this message translates to:
  /// **'Usage, data sources, and Google Drive'**
  String get storageSettingsBody;

  /// No description provided for @storageSourcesTitle.
  ///
  /// In en, this message translates to:
  /// **'Data sources'**
  String get storageSourcesTitle;

  /// No description provided for @storageSourcesBody.
  ///
  /// In en, this message translates to:
  /// **'Connect external libraries and manage where agency files live.'**
  String get storageSourcesBody;

  /// No description provided for @storageSourcePlatformBody.
  ///
  /// In en, this message translates to:
  /// **'Secure platform storage used across media, clients, and the portal.'**
  String get storageSourcePlatformBody;

  /// No description provided for @storageSourceDriveBody.
  ///
  /// In en, this message translates to:
  /// **'Connect Google Drive to import files or transfer copies out.'**
  String get storageSourceDriveBody;

  /// No description provided for @storageStatusConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get storageStatusConnected;

  /// No description provided for @storageStatusAvailable.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get storageStatusAvailable;

  /// No description provided for @storageStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Connecting'**
  String get storageStatusPending;

  /// No description provided for @storageStatusError.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get storageStatusError;

  /// No description provided for @storageStatusDisabled.
  ///
  /// In en, this message translates to:
  /// **'Not configured'**
  String get storageStatusDisabled;

  /// No description provided for @storageDriveConnect.
  ///
  /// In en, this message translates to:
  /// **'Connect Google Drive'**
  String get storageDriveConnect;

  /// No description provided for @storageDriveDisconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get storageDriveDisconnect;

  /// No description provided for @storageDriveTransferAll.
  ///
  /// In en, this message translates to:
  /// **'Transfer all to Drive'**
  String get storageDriveTransferAll;

  /// No description provided for @storageDriveNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Ask your platform admin to set Google Drive OAuth credentials.'**
  String get storageDriveNotConfigured;

  /// No description provided for @storageDriveConnectFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not start Google Drive connect.'**
  String get storageDriveConnectFailed;

  /// No description provided for @storageDriveDisconnectFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not disconnect Google Drive.'**
  String get storageDriveDisconnectFailed;

  /// No description provided for @storageDriveDisconnected.
  ///
  /// In en, this message translates to:
  /// **'Google Drive disconnected.'**
  String get storageDriveDisconnected;

  /// No description provided for @storageDriveTransferFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not start the Drive transfer.'**
  String get storageDriveTransferFailed;

  /// No description provided for @storageDriveTransferStarted.
  ///
  /// In en, this message translates to:
  /// **'Drive transfer started.'**
  String get storageDriveTransferStarted;

  /// No description provided for @storageZipSelect.
  ///
  /// In en, this message translates to:
  /// **'Select files'**
  String get storageZipSelect;

  /// No description provided for @storageZipDownload.
  ///
  /// In en, this message translates to:
  /// **'Download ZIP'**
  String get storageZipDownload;

  /// No description provided for @storageZipFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not build the ZIP.'**
  String get storageZipFailed;

  /// No description provided for @storageSelectedCount.
  ///
  /// In en, this message translates to:
  /// **'{count} selected'**
  String storageSelectedCount(int count);

  /// No description provided for @storageClearSelection.
  ///
  /// In en, this message translates to:
  /// **'Clear selection'**
  String get storageClearSelection;

  /// No description provided for @messagesDeleted.
  ///
  /// In en, this message translates to:
  /// **'Message deleted'**
  String get messagesDeleted;

  /// No description provided for @messagesGroupConversation.
  ///
  /// In en, this message translates to:
  /// **'Group chat'**
  String get messagesGroupConversation;

  /// No description provided for @messagesGroupNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Group name'**
  String get messagesGroupNameLabel;

  /// No description provided for @agentTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Agent'**
  String get agentTitle;

  /// No description provided for @agentNewSession.
  ///
  /// In en, this message translates to:
  /// **'New session'**
  String get agentNewSession;

  /// No description provided for @agentMultiAgent.
  ///
  /// In en, this message translates to:
  /// **'Multi-agent mode'**
  String get agentMultiAgent;

  /// No description provided for @agentUntitledSession.
  ///
  /// In en, this message translates to:
  /// **'Untitled session'**
  String get agentUntitledSession;

  /// No description provided for @agentToolsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} tools available'**
  String agentToolsCount(int count);

  /// No description provided for @agentConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get agentConfirm;

  /// No description provided for @agentEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Ask the agent to work for you'**
  String get agentEmptyTitle;

  /// No description provided for @agentEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Create a session to draft content, manage tasks, summarize data, and more — under your permissions.'**
  String get agentEmptyBody;

  /// No description provided for @agentComposerHint.
  ///
  /// In en, this message translates to:
  /// **'Ask the agent…'**
  String get agentComposerHint;

  /// No description provided for @agentSendFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not send your message.'**
  String get agentSendFailed;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
