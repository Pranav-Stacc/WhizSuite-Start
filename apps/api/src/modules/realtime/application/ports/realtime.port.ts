import type { RealtimeEvent } from '@agency-os/contracts';

/** Server-side push of realtime events; implemented by the Socket.IO gateway. */
export interface RealtimeEmitter {
  emitToRoom(room: string, event: RealtimeEvent, payload: unknown): void;
}

export const userRoom = (userId: string): string => `user:${userId}`;
export const orgRoom = (organizationId: string): string =>
  `org:${organizationId}`;
export const chatRoomChannel = (
  organizationId: string,
  roomId: string,
): string => `${orgRoom(organizationId)}:chat:${roomId}`;

