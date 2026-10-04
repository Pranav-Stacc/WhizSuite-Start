import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { status: 'ok', clientId: client.id });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: { ts?: number }) {
    client.emit('pong', { ts: data?.ts ?? Date.now(), serverTs: Date.now() });
    return { event: 'pong', data: { ok: true } };
  }

  broadcastToOrg(organizationId: string, event: string, payload: unknown): void {
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }
}
