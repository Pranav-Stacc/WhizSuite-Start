import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { AgentRepository } from '../../infrastructure/repositories/agent.repository';

@Injectable()
export class AgentSessionService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async createSession(organizationId: string, userId: string, title?: string) {
    const session = await this.repo.createSession(
      organizationId,
      userId,
      title,
    );
    return this.toSessionDto(session);
  }

  /** Reuse a titled session when present so chat @Whiz keeps conversation context. */
  async getOrCreateSession(
    organizationId: string,
    userId: string,
    title: string,
  ) {
    const existing = await this.repo.findSessionByTitle(
      organizationId,
      userId,
      title,
    );
    if (existing) return this.toSessionDto(existing);
    return this.createSession(organizationId, userId, title);
  }

  async getSession(organizationId: string, sessionId: string) {
    const session = await this.repo.findSession(organizationId, sessionId);
    if (!session) throw notFound();
    return {
      ...this.toSessionDto(session),
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  listSessions(organizationId: string, userId: string) {
    const limit = this.config.get('AGENT_SESSION_LIST_LIMIT', { infer: true });
    return this.repo
      .listSessions(organizationId, userId, limit)
      .then((rows) => rows.map((s) => this.toSessionDto(s)));
  }

  mintRunToken(user: AuthenticatedUser, runId: string): string {
    const ttl = this.config.get('AGENT_RUN_TOKEN_TTL_SECONDS', { infer: true });
    // Must match JwtStrategy access-token shape (`sub`, org/membership) so
    // capability/MCP calls from apps/agent authenticate as the same user.
    return this.jwt.sign(
      {
        type: 'agent_run',
        runId,
        sub: user.userId,
        email: user.email,
        organizationId: user.organizationId,
        membershipId: user.membershipId,
        membershipType: user.membershipType,
        clientId: user.clientId,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: ttl,
      },
    );
  }

  private toSessionDto(session: {
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
