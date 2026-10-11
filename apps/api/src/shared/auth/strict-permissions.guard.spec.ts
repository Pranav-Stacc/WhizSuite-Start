import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permissions } from '@agency-os/contracts';
import { StrictPermissionsGuard } from './strict-permissions.guard';
import { PERMISSIONS_ANY_KEY, PERMISSIONS_KEY } from './permissions.decorator';

describe('StrictPermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new StrictPermissionsGuard(reflector);

  function contextFor(routePath: string, user?: { userId: string; permissions?: string[] }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: routePath },
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  it('denies organization routes without permission metadata', () => {
    expect(() =>
      guard.canActivate(
        contextFor('/v1/organizations/:organizationId/clients', {
          userId: 'u1',
          permissions: [Permissions.CLIENTS_VIEW],
        }),
      ),
    ).toThrow();
  });

  it('allows when permissions are declared on handler', () => {
    class Handler {
      list() {}
    }
    const handler = Handler.prototype.list;
    Reflect.defineMetadata(PERMISSIONS_KEY, [Permissions.CLIENTS_VIEW], handler);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/v1/organizations/:organizationId/clients' },
          user: { userId: 'u1', permissions: [Permissions.CLIENTS_VIEW] },
        }),
      }),
      getHandler: () => handler,
      getClass: () => Handler,
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  function anyOfContext(permissions: string[]) {
    class Handler {
      list() {}
    }
    const handler = Handler.prototype.list;
    Reflect.defineMetadata(
      PERMISSIONS_ANY_KEY,
      [Permissions.CLIENTS_VIEW, Permissions.CONTENT_VIEW],
      handler,
    );
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          route: { path: '/v1/organizations/:organizationId/clients' },
          user: { userId: 'u1', permissions },
        }),
      }),
      getHandler: () => handler,
      getClass: () => Handler,
    } as unknown as ExecutionContext;
  }

  it('allows any-of routes when one permission is held', () => {
    expect(guard.canActivate(anyOfContext([Permissions.CONTENT_VIEW]))).toBe(true);
  });

  it('denies any-of routes when none are held', () => {
    expect(() => guard.canActivate(anyOfContext([]))).toThrow();
  });
});
