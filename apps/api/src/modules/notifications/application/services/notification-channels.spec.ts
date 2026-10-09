import { NotificationTypeKeys } from '@agency-os/contracts';
import { resolveChannels } from './notification-channels';
import { toOutboundNotification } from './outbound-notification';

const DEFAULTS = ['inApp', 'email'];

describe('resolveChannels', () => {
  it('uses configured defaults when nothing is stored', () => {
    expect(resolveChannels(undefined, DEFAULTS)).toEqual({
      inApp: true,
      email: true,
      push: false,
    });
  });

  it('lets stored booleans override defaults and ignores junk', () => {
    expect(
      resolveChannels({ inApp: false, push: true, email: 'yes' }, DEFAULTS),
    ).toEqual({
      inApp: false,
      email: true,
      push: true,
    });
  });

  it('ignores non-object stored values', () => {
    expect(resolveChannels(['push'], DEFAULTS)).toEqual({
      inApp: true,
      email: true,
      push: false,
    });
  });
});

describe('toOutboundNotification', () => {
  const stored = {
    id: 'n1',
    organizationId: 'o1',
    recipientId: 'u1',
    typeKey: NotificationTypeKeys.TASK_ASSIGNED,
    title: 'Shoot reel',
    body: '',
    data: { taskId: 't1', title: 'Shoot reel', eventId: 'e1', injected: 42 },
    readAt: null,
    createdAt: new Date('2026-10-09T00:00:00Z'),
  };

  it('renders the template copy from notification data', () => {
    const outbound = toOutboundNotification(stored);
    expect(outbound.subject).toBe('New task assigned');
    expect(outbound.body).toBe('You were assigned "Shoot reel".');
    expect(outbound.data).toEqual({
      taskId: 't1',
      contentId: undefined,
      title: 'Shoot reel',
    });
  });

  it('falls back to stored copy for unknown types', () => {
    const outbound = toOutboundNotification({
      ...stored,
      typeKey: 'unknown',
      body: 'raw body',
    });
    expect(outbound.subject).toBe('Shoot reel');
    expect(outbound.body).toBe('raw body');
  });
});
