import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { CorsOptions } from 'cors';
import type { ServerOptions } from 'socket.io';

type CorsOriginOption = NonNullable<CorsOptions['origin']>;

/** Applies the HTTP CORS allow-list to every Socket.IO namespace. */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: CorsOriginOption,
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
