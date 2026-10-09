import { Injectable } from '@nestjs/common';
import {
  CAPABILITY_BY_ID,
  CAPABILITY_CATALOG,
  capabilityRequiresConfirmation,
  type CapabilityDefinition,
  type CapabilityToolDescriptor,
  type Permission,
} from '@agency-os/contracts';
import { zodToJsonSchema } from '../utils/zod-to-json-schema';

@Injectable()
export class CapabilityRegistryService {
  get(id: string): CapabilityDefinition | undefined {
    return CAPABILITY_BY_ID.get(id);
  }

  listAll(): readonly CapabilityDefinition[] {
    return CAPABILITY_CATALOG;
  }

  /** Tools the user may invoke based on effective permissions. */
  listForUser(permissions: readonly Permission[]): CapabilityToolDescriptor[] {
    const granted = new Set(permissions);
    return CAPABILITY_CATALOG
      .filter((def) => def.permissions.every((p) => granted.has(p)))
      .map((def) => this.toDescriptor(def));
  }

  canUserAccess(def: CapabilityDefinition, permissions: readonly Permission[]): boolean {
    const granted = new Set(permissions);
    return def.permissions.every((p) => granted.has(p));
  }

  requiresConfirmation(def: CapabilityDefinition): boolean {
    return capabilityRequiresConfirmation(def);
  }

  private toDescriptor(def: CapabilityDefinition): CapabilityToolDescriptor {
    return {
      id: def.id,
      module: def.module,
      name: def.name,
      description: def.description,
      riskTier: def.riskTier,
      requiresConfirmation: capabilityRequiresConfirmation(def),
      inputSchema: zodToJsonSchema(def.inputSchema),
    };
  }
}
