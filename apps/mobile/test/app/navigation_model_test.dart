import 'package:agency_os/app/navigation/app_routes.dart';
import 'package:agency_os/app/navigation/destinations.dart';
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

    test('staff primary tabs are Overview, Clients, Content, Calendar — not To-do', () {
      const policy = AccessPolicy({
        Permissions.orgView,
        Permissions.clientsView,
        Permissions.contentView,
        Permissions.projectsView,
        Permissions.tasksView,
      });
      final model = NavigationModel(_session(MembershipTypes.member), policy);
      expect(model.primary.map((d) => d.path).toList(), [
        AppRoutes.home,
        '/clients',
        '/content',
        '/calendar',
      ]);
      expect(model.primary.map((d) => d.path), isNot(contains('/tasks')));
      expect(model.sidebarGroups[NavGroup.work]?.map((d) => d.path), contains('/tasks'));
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
