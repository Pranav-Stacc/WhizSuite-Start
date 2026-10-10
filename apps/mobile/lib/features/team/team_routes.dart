abstract final class TeamRoutes {
  static const root = '/team';
  static const memberParam = 'userId';
  static const membersSegment = 'members';

  static String member(String userId) => '$root/$membersSegment/$userId';
}
