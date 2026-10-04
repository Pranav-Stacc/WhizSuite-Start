import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { isE2eDbUnavailable } from './e2e-env';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (isE2eDbUnavailable()) return;
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /api/health', async () => {
    if (isE2eDbUnavailable()) return;
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
