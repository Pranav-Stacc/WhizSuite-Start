import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

/** Origin checker shared with HTTP CORS (exact + wildcard entries). */
export type CorsOriginChecker = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

/** Applies the HTTP CORS allow-list to every Socket.IO namespace. */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: CorsOriginChecker,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
    });
  }
}
