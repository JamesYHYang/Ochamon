import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, CreateAuditLogDto, ListAuditLogsQueryDto } from './dto';
import { Prisma } from '@prisma/client';

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    data: Omit<CreateAuditLogDto, 'ipAddress' | 'userAgent'>,
    context: AuditContext,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action as Prisma.AuditLogCreateInput['action'],
          entityType: data.entityType,
          entityId: data.entityId,
          description: data.description,
          metadata: data.metadata as Prisma.InputJsonValue,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          userId: context.userId,
        },
      });
      this.logger.debug(
        `Audit log created: ${data.action} on ${data.entityType} by user ${context.userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async logCreate(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.CREATE,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.UPDATE,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async logDelete(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.DELETE,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async logPublish(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.PUBLISH,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async logUnpublish(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.UNPUBLISH,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async logToggle(
    entityType: string,
    entityId: string,
    description: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      {
        action: AuditAction.TOGGLE,
        entityType,
        entityId,
        description,
        metadata,
      },
      context,
    );
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const {
      skip = 0,
      take = 20,
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        skip,
        take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getAuditLogById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getUserActivity(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
