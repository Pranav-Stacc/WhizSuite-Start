import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../shared/config/app.config';
import { GoogleDriveClient } from './google-drive.client';

describe('GoogleDriveClient', () => {
  const config = {
    get: jest.fn((key: keyof AppConfig) => {
      const values: Partial<Record<keyof AppConfig, string>> = {
        GOOGLE_DRIVE_CLIENT_ID: 'client-id',
        GOOGLE_DRIVE_CLIENT_SECRET: 'client-secret',
        GOOGLE_DRIVE_REDIRECT_URI: 'http://localhost/callback',
        GOOGLE_DRIVE_API_KEY: 'api-key',
        GOOGLE_CLOUD_PROJECT_NUMBER: '1234567890',
      };
      return values[key] ?? '';
    }),
  } as unknown as ConfigService<AppConfig, true>;

  const client = new GoogleDriveClient(config);

  it('builds authorize url with drive.file scope only', () => {
    const url = client.buildAuthorizeUrl('state-token');
    expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file');
    expect(url).not.toContain('drive.readonly');
  });

  it('reports picker readiness from api key', () => {
    expect(client.isPickerConfigured()).toBe(true);
    expect(client.getPickerApiKey()).toBe('api-key');
    expect(client.getPickerAppId()).toBe('1234567890');
  });

  it('downloads binary files from Drive', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'file-1',
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: '4',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      } as Response);

    const file = await client.downloadFile('token', 'file-1');
    expect(file).toEqual({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      body: Buffer.from([1, 2, 3, 4]),
    });
    fetchMock.mockRestore();
  });

  it('exports Google Docs as PDF', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'doc-1',
          name: 'Brief',
          mimeType: 'application/vnd.google-apps.document',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Uint8Array.from([9, 9]).buffer,
      } as Response);

    const file = await client.downloadFile('token', 'doc-1');
    expect(file.name).toBe('Brief.pdf');
    expect(file.mimeType).toBe('application/pdf');
    fetchMock.mockRestore();
  });
});
