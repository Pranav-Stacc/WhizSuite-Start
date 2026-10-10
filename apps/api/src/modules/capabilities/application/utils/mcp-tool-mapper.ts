import type { CapabilityToolDescriptor } from '@agency-os/contracts';

/** MCP protocol version supported by the capabilities JSON-RPC endpoint. */
export const MCP_PROTOCOL_VERSION = '2024-11-05';

/** Tool shape returned by MCP `tools/list` (name is the capability id). */
export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    displayName: string;
    module: string;
    riskTier: string;
    requiresConfirmation: boolean;
  };
}

export function toMcpTool(tool: CapabilityToolDescriptor): McpToolDescriptor {
  const displayName = tool.name.trim();
  const description = tool.description.trim();
  const combined =
    displayName && displayName !== tool.id
      ? `${displayName} — ${description}`
      : description || displayName || tool.id;

  return {
    name: tool.id,
    description: combined,
    inputSchema: tool.inputSchema,
    annotations: {
      displayName,
      module: tool.module,
      riskTier: tool.riskTier,
      requiresConfirmation: tool.requiresConfirmation,
    },
  };
}

export function toMcpTools(
  tools: CapabilityToolDescriptor[],
): McpToolDescriptor[] {
  return tools.map(toMcpTool);
}
