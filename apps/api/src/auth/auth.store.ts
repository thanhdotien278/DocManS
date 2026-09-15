import { Injectable, UnauthorizedException } from "@nestjs/common";
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
        organizationScopes: { include: { organizationUnit: true } },
        researcherProfile: { select: { id: true, status: true } }
      }
    });

    return user ? this.toInternalUser(user) : null;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationScopes: { include: { organizationUnit: true } },
        researcherProfile: { select: { id: true, status: true } }
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
      organizationScopes: user.organizationScopes,
      mustChangePassword: user.mustChangePassword,
      researcherProfileId: user.researcherProfileId
    };
  }

  async createSession(userId: string, credentialVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.status !== "active" || user.credentialVersion !== credentialVersion) throw new UnauthorizedException();
      const session = await tx.session.create({ data: { userId, credentialVersion, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
      return this.toAuthSession(session);
    });
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

  async changePassword(userId: string, passwordHash: string, expectedCredentialVersion: number, audit: { action: string; username: string; ip?: string; userAgent?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, status: "active", credentialVersion: expectedCredentialVersion },
        data: { passwordHash, mustChangePassword: false, credentialVersion: { increment: 1 } }
      });
      if (changed.count !== 1) return false;
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.auditLog.create({ data: { ...audit, actorId: userId, targetEntity: "user", targetEntityId: userId, result: "success" } });
      return true;
    });
  }

  async createPasswordResetToken(userId: string, createdById: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
      return tx.passwordResetToken.create({ data: { userId, createdById, tokenHash, expiresAt, credentialVersion: user.credentialVersion } });
    });
  }

  async completePasswordReset(tokenHash: string, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
      });
      if (!token) {
        return null;
      }
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${token.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: token.userId } });
      if (!user || user.status !== "active" || user.credentialVersion !== token.credentialVersion) return null;
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() }
      });
      if (consumed.count !== 1) {
        return null;
      }
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash, mustChangePassword: false, credentialVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: new Date() } });
      return token.userId;
    });
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
    mustChangePassword?: boolean;
    credentialVersion?: number;
    researcherProfile?: { id: string; status: string } | null;
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
      organizationScopes,
      mustChangePassword: user.mustChangePassword ?? false,
      credentialVersion: user.credentialVersion ?? 0,
      researcherProfileId: user.researcherProfile?.status === "ACTIVE" ? user.researcherProfile.id : undefined
    };
  }

  private toAuthSession(session: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    credentialVersion: number;
  }): AuthSession {
    return {
      credentialVersion: session.credentialVersion,
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString()
    };
  }
}
