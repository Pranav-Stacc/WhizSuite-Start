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
  /// **'Agency OS'**
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
  /// **'New to Agency OS?'**
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
  /// **'Agency OS'**
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
  /// **'Sign out of Agency OS on this device?'**
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

  /// No description provided for @themePresetEditorial.
  ///
  /// In en, this message translates to:
  /// **'Editorial'**
  String get themePresetEditorial;

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

  /// No description provided for @themePresetDaylight.
  ///
  /// In en, this message translates to:
  /// **'Daylight'**
  String get themePresetDaylight;

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
