import { z } from 'zod';

export const ActorSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['user', 'system', 'service', 'client_user']),
});

export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  version: z.number().int().positive(),
  organizationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  actor: ActorSchema,
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type Actor = z.infer<typeof ActorSchema>;
