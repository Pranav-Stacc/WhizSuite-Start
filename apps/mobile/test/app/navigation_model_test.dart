import 'package:agency_os/app/navigation/app_routes.dart';
import 'package:agency_os/app/navigation/destinations.dart';
import 'package:agency_os/app/navigation/shell_chrome_policy.dart';
import 'package:agency_os/features/team/team_routes.dart';
import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/access/domain/access_policy.dart';
import 'package:agency_os/features/auth/domain/session.dart';
import 'package:flutter_test/flutter_test.dart';

Session _session(String membershipType) => Session(
      userId: 'u1',
      email: 'member@agency.test',
      organizationId: 'org1',
      membershipId: 'm1',
      membershipType: membershipType,
    );

void main() {
  group('NavigationModel', () {
    test('shows only destinations granted by the member\'s effective permissions', () {
      final model = NavigationModel(_session(MembershipTypes.member), const AccessPolicy.none());

      final paths = model.visible.map((d) => d.path);
      expect(paths, isNot(contains(AppRoutes.home)));
      expect(paths, contains(AppRoutes.settings));
    });

    test('a custom role granting org.view unlocks home regardless of membership type', () {
      const customRole = AccessPolicy({Permissions.orgView});

      for (final type in [MembershipTypes.admin, MembershipTypes.member, MembershipTypes.client]) {
        final model = NavigationModel(_session(type), customRole);
        expect(model.visible.map((d) => d.path), contains(AppRoutes.home), reason: type);
      }
    });

    test('client memberships get the portal audience, staff get the agency audience', () {
      expect(audienceOf(_session(MembershipTypes.client)), Audience.portal);
      expect(audienceOf(_session(MembershipTypes.owner)), Audience.staff);
      expect(audienceOf(_session(MembershipTypes.member)), Audience.staff);
    });

    test('destinationFor matches nested routes by longest prefix', () {
      expect(destinationFor(AppRoutes.appearance)?.path, AppRoutes.settings);
      expect(destinationFor('/unknown'), isNull);
    });

    test('staff primary tabs pin Clients, Messages, Agency around Overview, then More', () {
      const policy = AccessPolicy({
        Permissions.orgView,
        Permissions.clientsView,
        Permissions.chatView,
        Permissions.calendarView,
        Permissions.contentView,
        Permissions.projectsView,
        Permissions.tasksView,
        Permissions.membersView,
      });
      final model = NavigationModel(_session(MembershipTypes.member), policy);
      expect(model.primary.map((d) => d.path).toList(), [
        '/clients',
        '/messages',
        AppRoutes.home,
        '/team',
        AppRoutes.more,
      ]);
      expect(model.primary.map((d) => d.path), isNot(contains('/calendar')));
      expect(model.primary.map((d) => d.path), isNot(contains('/tasks')));
    });

    test('drawer sidebar omits bottom-nav pins and lists Work first', () {
      const policy = AccessPolicy({
        Permissions.orgView,
        Permissions.clientsView,
        Permissions.chatView,
        Permissions.calendarView,
        Permissions.projectsView,
        Permissions.tasksView,
        Permissions.contentView,
        Permissions.membersView,
      });
      final model = NavigationModel(_session(MembershipTypes.member), policy);
      final drawer = model.sidebarGroups(includePrimary: false);
      expect(drawer.keys.first, NavGroup.work);
      expect(drawer[NavGroup.work]?.map((d) => d.path), containsAll(['/tasks', '/projects']));
      expect(drawer[NavGroup.work]?.map((d) => d.path), contains('/calendar'));
      expect(drawer[NavGroup.clients]?.map((d) => d.path) ?? const <String>[], isNot(contains('/clients')));
      expect(drawer[NavGroup.clients]?.map((d) => d.path) ?? const <String>[], isNot(contains('/messages')));
      expect(drawer[NavGroup.clients]?.map((d) => d.path) ?? const <String>[], isNot(contains('/team')));
    });

    test('Agency menus keep Team and settings; departments/roles and templates stay out of grids', () {
      const policy = AccessPolicy({
        Permissions.orgView,
        Permissions.membersView,
        Permissions.rolesManage,
        Permissions.orgSettingsManage,
        Permissions.orgBillingManage,
        Permissions.auditView,
      });
      final model = NavigationModel(_session(MembershipTypes.member), policy);
      expect(model.primary.map((d) => d.path), contains('/team'));
      final agency = model.secondaryGroups[NavGroup.agency]?.map((d) => d.path).toList() ?? [];
      expect(agency, containsAll(['/knowledge', '/billing', '/audit', AppRoutes.settings]));
      expect(agency, isNot(contains('/team')));
      expect(agency, isNot(contains('/departments')));
      expect(agency, isNot(contains('/roles')));
      expect(agency, isNot(contains('/templates')));
      expect(agency, isNot(contains('/custom-fields')));
      expect(agencyHubPaths, containsAll(['/departments', '/roles']));
      expect(featurePageOnlyPaths, containsAll(['/templates', '/custom-fields']));
    });
  });

  group('shell chrome policy', () {
    test('shows hub actions only on root destination paths', () {
      expect(shellActionsVisibleFor(AppRoutes.home), isTrue);
      expect(shellActionsVisibleFor('/clients'), isTrue);
      expect(shellActionsVisibleFor('/team'), isTrue);
      expect(shellActionsVisibleFor('${TeamRoutes.root}${TeamRoutes.member('u1')}'), isFalse);
      expect(shellActionsVisibleFor('/clients/c1'), isFalse);
      expect(shellActionsVisibleFor(AppRoutes.notifications), isFalse);
      expect(shellActionsVisibleFor(AppRoutes.settings), isFalse);
      expect(shellActionsVisibleFor('/search'), isFalse);
    });
  });

  group('AccessPolicy', () {
    const policy = AccessPolicy({Permissions.tasksView, Permissions.contentView});

    test('canAny passes when one permission is held and for empty requirements', () {
      expect(policy.canAny([Permissions.invoicesView, Permissions.tasksView]), isTrue);
      expect(policy.canAny(const []), isTrue);
      expect(policy.canAny([Permissions.rolesManage]), isFalse);
    });

    test('canAll requires every permission', () {
      expect(policy.canAll([Permissions.tasksView, Permissions.contentView]), isTrue);
      expect(policy.canAll([Permissions.tasksView, Permissions.rolesManage]), isFalse);
    });

    test('equality ignores ordering so refreshes do not rebuild needlessly', () {
      expect(policy, const AccessPolicy({Permissions.contentView, Permissions.tasksView}));
    });
  });
}
