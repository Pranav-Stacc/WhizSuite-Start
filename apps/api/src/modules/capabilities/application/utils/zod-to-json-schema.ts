import { z } from 'zod';

/** Minimal JSON Schema export for MCP / agent tool definitions. */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodFieldToSchema(value as z.ZodTypeAny);
      if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
    }
    return { type: 'object', properties, required };
  }
  return { type: 'object', properties: {} };
}

function zodFieldToSchema(field: z.ZodTypeAny): Record<string, unknown> {
  if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) {
    return zodFieldToSchema(field._def.innerType as z.ZodTypeAny);
  }
  if (field instanceof z.ZodString) {
    const out: Record<string, unknown> = { type: 'string' };
    if (field._def.checks) {
      for (const check of field._def.checks) {
        if (check.kind === 'uuid') out.format = 'uuid';
        if (check.kind === 'email') out.format = 'email';
        if (check.kind === 'datetime') out.format = 'date-time';
        if (check.kind === 'min') out.minLength = check.value;
        if (check.kind === 'max') out.maxLength = check.value;
      }
    }
    return out;
  }
  if (field instanceof z.ZodNumber) return { type: 'number' };
  if (field instanceof z.ZodBoolean) return { type: 'boolean' };
  if (field instanceof z.ZodEnum) return { type: 'string', enum: field._def.values };
  if (field instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodFieldToSchema(field._def.type as z.ZodTypeAny),
    };
  }
  return { type: 'string' };
}
