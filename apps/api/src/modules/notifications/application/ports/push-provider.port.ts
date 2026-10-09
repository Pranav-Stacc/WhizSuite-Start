export interface PushMessage {
  title: string;
  body: string;
  /** Flat string map delivered to the app for deep-linking. */
  data: Record<string, string>;
}

export interface PushSendResult {
  successCount: number;
  /** Tokens the provider reports as permanently invalid; callers should forget them. */
  invalidTokens: string[];
}

export interface PushProvider {
  isEnabled(): boolean;
  send(tokens: string[], message: PushMessage): Promise<PushSendResult>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
