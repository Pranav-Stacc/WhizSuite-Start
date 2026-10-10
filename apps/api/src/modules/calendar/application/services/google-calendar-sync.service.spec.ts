import { GOOGLE_CALENDAR_PROVIDER_KEY } from '@agency-os/contracts';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

describe('GoogleCalendarSyncService', () => {
  const integrations = {
    findByProviderKey: jest.fn(),
    findProviderByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsertCredential: jest.fn(),
    findCredential: jest.fn(),
  };
  const connections = {
    findByOrganization: jest.fn(),
    findByIntegrationConnection: jest.fn(),
    upsert: jest.fn(),
    updateSettings: jest.fn(),
    deleteByOrganization: jest.fn(),
  };
  const calendar = {
    findById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByExternalEventId: jest.fn(),
  };
  const google = {
    isConfigured: jest.fn().mockReturnValue(true),
    buildAuthorizeUrl: jest
      .fn()
      .mockReturnValue('https://accounts.google.com/o'),
    exchangeCode: jest.fn(),
    refreshAccessToken: jest.fn(),
    upsertEvent: jest.fn(),
    listEvents: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const syncQueue = {
    enqueueOutbound: jest.fn(),
    enqueueInbound: jest.fn(),
  };
  const config = { get: jest.fn() };

  const service = new GoogleCalendarSyncService(
    integrations as never,
    connections as never,
    calendar as never,
    google as never,
    audit as never,
    syncQueue as never,
    config as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    google.isConfigured.mockReturnValue(true);
  });

  it('returns DISABLED when OAuth is not configured', async () => {
    google.isConfigured.mockReturnValue(false);
    integrations.findByProviderKey.mockResolvedValue(null);

    const status = await service.getConnection('org-1');

    expect(status.status).toBe('DISABLED');
    expect(status.oauthConfigured).toBe(false);
    expect(status.id).toBe(GOOGLE_CALENDAR_PROVIDER_KEY);
  });

  it('enqueues outbound sync only when syncToGoogle is true and connected', async () => {
    integrations.findByProviderKey.mockResolvedValue({
      id: 'conn-1',
      status: 'CONNECTED',
      createdAt: new Date(),
    });
    connections.findByIntegrationConnection.mockResolvedValue({
      id: 'cal-conn',
      externalCalendarId: 'primary',
      syncDirection: 'OUT',
      defaultSyncNewEvents: false,
      lastSyncedAt: null,
    });

    await service.enqueueIfNeeded('org-1', 'item-1', true, 'user-1');
    expect(syncQueue.enqueueOutbound).toHaveBeenCalledWith({
      organizationId: 'org-1',
      calendarItemId: 'item-1',
      actorId: 'user-1',
    });

    syncQueue.enqueueOutbound.mockClear();
    await service.enqueueIfNeeded('org-1', 'item-1', false, 'user-1');
    expect(syncQueue.enqueueOutbound).not.toHaveBeenCalled();
  });
});
