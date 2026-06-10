import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import type { AuthSession, InternalUser, SafeUserContext } from "./auth.types.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

@Injectable()
export class AuthStore {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { usernameKey: username.trim().toLowerCase() },
      include: {
        roleAssignments: { include: { role: true } },
        organizationScopes: { include: { organizationUnit: true } }
      }
    });

    return user ? this.toInternalUser(user) : null;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: { include: { role: true } },
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
      role: user.role,
      roleLabel: user.roleLabel,
      unit: user.unit,
      roles: user.roles,
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
    role: string;
    roleLabel: string;
    unit: string;
    roleAssignments?: Array<{
      isPrimary: boolean;
      role: {
        code: string;
        label: string;
        status: string;
      };
    }>;
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
    const activeRoleAssignments = user.roleAssignments?.filter((assignment) => assignment.role.status === "active") ?? [];
    if (activeRoleAssignments.length === 0) {
      return null;
    }

    const primaryRoleAssignment = activeRoleAssignments.find((assignment) => assignment.isPrimary) ?? activeRoleAssignments[0];
    const primaryRole = primaryRoleAssignment.role.code;
    const role = this.toRole(primaryRole);

    if (!role) {
      return null;
    }

    const roles = activeRoleAssignments
      .map((assignment) => this.toRole(assignment.role.code))
      .filter((item): item is InternalUser["role"] => Boolean(item));
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
      role,
      roleLabel: primaryRoleAssignment.role.label,
      unit: organizationScopes[0].name,
      roles: roles.length ? roles : [role],
      organizationScopes
    };
  }

  private toRole(role: string): InternalUser["role"] | null {
    if (
      role === "system-admin" ||
      role === "leadership" ||
      role === "scientific-management" ||
      role === "principal-investigator" ||
      role === "reviewer" ||
      role === "council-member"
    ) {
      return role;
    }

    return null;
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
