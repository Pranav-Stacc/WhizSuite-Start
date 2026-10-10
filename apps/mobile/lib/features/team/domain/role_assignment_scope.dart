class RoleAssignmentScope {
  const RoleAssignmentScope({required this.scopeType, this.resourceId});

  final String scopeType;
  final String? resourceId;

  Map<String, Object?> toJson() => {
        'scopeType': scopeType,
        if (resourceId != null) 'resourceId': resourceId,
      };
}
