import { Injectable } from '@nestjs/common';
import type { RealtimeEvent } from '@agency-os/contracts';
import { RealtimeGateway } from '../../interface/ws/realtime.gateway';
import {
  orgRoom,
  userRoom,
  type RealtimeEmitter,
} from '../ports/realtime.port';

/** Public port of the realtime domain: other modules publish through this, never the gateway. */
@Injectable()
export class RealtimeService {
  private readonly emitter: RealtimeEmitter;

  constructor(gateway: RealtimeGateway) {
    this.emitter = gateway;
  }

  /** Rooms are tenant-qualified so a user in two organizations only hears the active one. */
  publishToUser(
    organizationId: string,
    userId: string,
    event: RealtimeEvent,
    payload: unknown,
  ): void {
    this.emitter.emitToRoom(
      `${orgRoom(organizationId)}:${userRoom(userId)}`,
      event,
      payload,
    );
  }

  publishToOrganization(
    organizationId: string,
    event: RealtimeEvent,
    payload: unknown,
  ): void {
    this.emitter.emitToRoom(orgRoom(organizationId), event, payload);
  }

  /** Emit to an already-qualified Socket.IO room (e.g. chat channel). */
  publishToRoom(room: string, event: RealtimeEvent, payload: unknown): void {
    this.emitter.emitToRoom(room, event, payload);
  }
}
