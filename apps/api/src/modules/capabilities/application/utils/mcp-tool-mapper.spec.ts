import { toMcpTool } from './mcp-tool-mapper';

describe('mcp-tool-mapper', () => {
  it('maps capability descriptors to MCP tools/list shape', () => {
    const mcp = toMcpTool({
      id: 'clients.create',
      module: 'clients',
      name: 'Create client',
      description: 'Creates a new client record.',
      riskTier: 'write_low',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: { displayName: { type: 'string' } },
        required: ['displayName'],
      },
    });

    expect(mcp.name).toBe('clients.create');
    expect(mcp.description).toContain('Create client');
    expect(mcp.inputSchema).toMatchObject({
      type: 'object',
      required: ['displayName'],
    });
    expect(mcp.annotations).toMatchObject({
      displayName: 'Create client',
      module: 'clients',
      riskTier: 'write_low',
      requiresConfirmation: false,
    });
  });
});
