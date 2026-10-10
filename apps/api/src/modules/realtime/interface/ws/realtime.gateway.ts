import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  REALTIME_NAMESPACE,
  RealtimeEvents,
  type RealtimeEvent,
} from '@agency-os/contracts';
import type { Server, Socket } from 'socket.io';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  chatRoomChannel,
  orgRoom,
  userRoom,
  type RealtimeEmitter,
} from '../../application/ports/realtime.port';

const BEARER_PREFIX = 'Bearer ';

interface SocketIdentity {
  userId: string;
  organizationId: string;
}

interface RealtimeSocketData {
  identity?: SocketIdentity;
}

function socketData(client: Socket): RealtimeSocketData {
  return client.data as RealtimeSocketData;
}

function handshakeToken(client: Socket): string | undefined {
  const fromAuth: unknown = client.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
  const header = client.handshake.headers.authorization;
  return header?.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length)
    : undefined;
}

/** CORS for this namespace is applied by the configured Socket.IO adapter (see main.ts). */
@WebSocketGateway({ namespace: REALTIME_NAMESPACE })
export class RealtimeGateway implements OnGatewayConnection, RealtimeEmitter {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const identity = await this.authenticate(client);
    if (!identity) {
      client.disconnect(true);
      return;
    }
    socketData(client).identity = identity;
    const org = orgRoom(identity.organizationId);
    await client.join([org, `${org}:${userRoom(identity.userId)}`]);
    client.emit(RealtimeEvents.CONNECTED, { status: 'ok' });
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ts?: number },
  ) {
    client.emit(RealtimeEvents.PONG, {
      ts: data?.ts ?? Date.now(),
      serverTs: Date.now(),
    });
  }

  @SubscribeMessage('chat.join')
  async handleChatJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId?: string },
  ) {
    const identity = socketData(client).identity;
    if (!identity || typeof data?.roomId !== 'string') return { ok: false };
    await client.join(chatRoomChannel(identity.organizationId, data.roomId));
    return { ok: true };
  }

  @SubscribeMessage('chat.leave')
  async handleChatLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId?: string },
  ) {
    const identity = socketData(client).identity;
    if (!identity || typeof data?.roomId !== 'string') return { ok: false };
    await client.leave(chatRoomChannel(identity.organizationId, data.roomId));
    return { ok: true };
  }

  emitToRoom(room: string, event: RealtimeEvent, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  private async authenticate(client: Socket): Promise<SocketIdentity | null> {
    const token = handshakeToken(client);
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: unknown;
        organizationId?: unknown;
      }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.organizationId !== 'string'
      )
        return null;
      return { userId: payload.sub, organizationId: payload.organizationId };
    } catch (error) {
      this.logger.debug({ err: error }, 'Rejected realtime connection');
      return null;
    }
  }
}
