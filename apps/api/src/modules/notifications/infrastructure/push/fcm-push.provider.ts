import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type { AppConfig } from '../../../../shared/config/app.config';
import type {
  PushMessage,
  PushProvider,
  PushSendResult,
} from '../../application/ports/push-provider.port';

const FIREBASE_APP_NAME = 'agency-os-push';
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Firebase Cloud Messaging (Android, iOS via APNs, web). Initialised lazily and only when PUSH_ENABLED. */
@Injectable()
export class FcmPushProvider implements PushProvider {
  private app?: App;
  private messaging?: Messaging;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isEnabled(): boolean {
    return this.config.get('PUSH_ENABLED', { infer: true });
  }

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    const response = await this.client().sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: 'high',
        notification: {
          channelId: this.config.get('PUSH_ANDROID_CHANNEL_ID', {
            infer: true,
          }),
        },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    const invalidTokens = tokens.filter((_, i) => {
      const result = response.responses[i];
      return (
        result !== undefined &&
        !result.success &&
        INVALID_TOKEN_CODES.has(result.error?.code ?? '')
      );
    });
    return { successCount: response.successCount, invalidTokens };
  }

  private client(): Messaging {
    if (!this.messaging) {
      this.app = initializeApp(
        {
          credential: cert({
            projectId: this.config.get('FCM_PROJECT_ID', { infer: true }),
            clientEmail: this.config.get('FCM_CLIENT_EMAIL', { infer: true }),
            privateKey: this.config
              .get('FCM_PRIVATE_KEY', { infer: true })
              .replace(/\\n/g, '\n'),
          }),
        },
        FIREBASE_APP_NAME,
      );
      this.messaging = getMessaging(this.app);
    }
    return this.messaging;
  }
}
