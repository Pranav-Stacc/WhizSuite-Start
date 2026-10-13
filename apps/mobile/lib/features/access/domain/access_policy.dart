/// Explicit permissions from `/v1/access/capabilities` (role grants ± overrides; no companions).
/// The UI never infers access from role names or membership types.
class AccessPolicy {
  const AccessPolicy(this.granted);

  const AccessPolicy.none() : granted = const {};

  final Set<String> granted;

  bool can(String permission) => granted.contains(permission);

  /// Empty requirements mean "any signed-in member".
  bool canAny(Iterable<String> permissions) => permissions.isEmpty || permissions.any(granted.contains);

  bool canAll(Iterable<String> permissions) => permissions.every(granted.contains);

  @override
  bool operator ==(Object other) =>
      other is AccessPolicy && other.granted.length == granted.length && other.granted.containsAll(granted);

  @override
  int get hashCode => Object.hashAllUnordered(granted);
}
