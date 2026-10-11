import {
  isSourceTypeSyncEnabled,
  sourceTypeSyncKey,
} from './google-calendar-sync-types';

describe('google-calendar-sync-types', () => {
  const types = {
    meetings: true,
    shoots: false,
    tasks: true,
    posts: false,
  };

  it('maps source types to sync keys', () => {
    expect(sourceTypeSyncKey('SHOOT')).toBe('shoots');
    expect(sourceTypeSyncKey('CONTENT')).toBe('posts');
    expect(sourceTypeSyncKey('MEETING')).toBe('meetings');
    expect(sourceTypeSyncKey('INVOICE')).toBeNull();
  });

  it('respects org toggles', () => {
    expect(isSourceTypeSyncEnabled('SHOOT', types)).toBe(false);
    expect(isSourceTypeSyncEnabled('TASK', types)).toBe(true);
  });
});
