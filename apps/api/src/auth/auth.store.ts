import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { SYSTEM_ROLES, type AuthSession, type InternalUser, type SafeUserContext, type SystemRole } from "./auth.types.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

@Injectable()
export class AuthStore {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { usernameKey: username.trim().toLowerCase() },
      include: {
        organizationScopes: { include: { organizationUnit: true } }
      }
    });

    return user ? this.toInternalUser(user) : null;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationScopes: { include: { organizationUnit: true } }
      }
    });

    return user ? this.toInternalUser(user) : null;
  }

  toSafeUser(user: InternalUser): SafeUserContext {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      systemRole: user.systemRole,
      unit: user.unit,
      organizationScopes: user.organizationScopes
    };
  }

  async createSession(userId: string) {
    const session = await this.prisma.session.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS)
      }
    });

    return this.toAuthSession(session);
  }

  async revokeSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.revokedAt) {
      return null;
    }

    const revokedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });

    return this.toAuthSession(revokedSession);
  }

  async getActiveSession(sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      return null;
    }

    return this.toAuthSession(session);
  }

  private toInternalUser(user: {
    id: string;
    username: string;
    displayName: string;
    passwordHash: string;
    status: string;
    systemRole: string | null;
    unit: string;
    organizationScopes?: Array<{
      isPrimary: boolean;
      organizationUnit: {
        id: string;
        code: string;
        name: string;
        status: string;
      };
    }>;
  }): InternalUser | null {
    if (!user.systemRole || !SYSTEM_ROLES.includes(user.systemRole as SystemRole)) {
      return null;
    }
    const systemRole = user.systemRole as SystemRole;
    const organizationScopes =
      user.organizationScopes
        ?.filter((scope) => scope.organizationUnit.status === "active")
        .map((scope) => ({
          id: scope.organizationUnit.id,
          code: scope.organizationUnit.code,
          name: scope.organizationUnit.name
        })) ?? [];

    if (organizationScopes.length === 0) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      status: user.status === "active" ? "active" : "disabled",
      systemRole,
      unit: organizationScopes[0].name,
      organizationScopes
    };
  }

  private toAuthSession(session: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
  }): AuthSession {
    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString()
    };
  }
}
