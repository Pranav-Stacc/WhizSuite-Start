import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { CapabilityExecutorService } from './capability-executor.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { McpRpcService } from './mcp-rpc.service';

describe('McpRpcService', () => {
  const user: AuthenticatedUser = {
    userId: 'user-1',
    email: 'u@example.com',
    permissions: ['ai.chat'],
  };

  let registry: jest.Mocked<Pick<CapabilityRegistryService, 'listForUserCached'>>;
  let executor: jest.Mocked<Pick<CapabilityExecutorService, 'execute' | 'executeBatch'>>;
  let service: McpRpcService;

  beforeEach(() => {
    registry = {
      listForUserCached: jest.fn(),
    };
    executor = {
      execute: jest.fn(),
      executeBatch: jest.fn(),
    };
    service = new McpRpcService(
      registry as unknown as CapabilityRegistryService,
      executor as unknown as CapabilityExecutorService,
    );
  });

  it('returns initialize handshake', async () => {
    const res = await service.handle('org-1', user, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });
    expect(res.result).toMatchObject({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'whizsuite-capabilities' },
    });
  });

  it('lists tools via registry', async () => {
    registry.listForUserCached.mockResolvedValue([
      {
        id: 'clients.create',
        module: 'clients',
        name: 'Create client',
        description: 'Creates a client',
        riskTier: 'write_low',
        requiresConfirmation: false,
        inputSchema: { type: 'object', properties: {} },
      },
    ]);

    const res = await service.handle('org-1', user, {
      jsonrpc: '2.0',
      id: 'list',
      method: 'tools/list',
    });

    expect(registry.listForUserCached).toHaveBeenCalledWith('org-1', 'user-1', ['ai.chat']);
    expect(res.result).toMatchObject({
      tools: [{ name: 'clients.create' }],
    });
  });

  it('executes tools/call and wraps MCP content', async () => {
    executor.execute.mockResolvedValue({ status: 'ok', output: { id: 'c1' } });

    const res = await service.handle('org-1', user, {
      jsonrpc: '2.0',
      id: 'call',
      method: 'tools/call',
      params: {
        name: 'clients.create',
        arguments: { displayName: 'Acme' },
        runId: 'run-1',
      },
    });

    expect(executor.execute).toHaveBeenCalledWith('org-1', user, {
      toolId: 'clients.create',
      input: { displayName: 'Acme' },
      runId: 'run-1',
    });
    expect(res.result).toMatchObject({
      content: [{ type: 'text', text: JSON.stringify({ status: 'ok', output: { id: 'c1' } }) }],
    });
  });

  it('returns method not found for unknown RPC', async () => {
    const res = await service.handle('org-1', user, {
      jsonrpc: '2.0',
      id: 9,
      method: 'resources/list',
    });
    expect(res.error).toMatchObject({ code: -32601 });
  });
});
