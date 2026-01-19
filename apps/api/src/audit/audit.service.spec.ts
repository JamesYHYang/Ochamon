import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditContext } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from './dto';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;

  const mockAuditLog = {
    id: 'audit-1',
    action: 'CREATE',
    entityType: 'ComplianceRule',
    entityId: 'rule-1',
    description: 'Created compliance rule',
    metadata: { country: 'US' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    userId: 'user-1',
    createdAt: new Date(),
    user: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@test.com',
    },
  };

  const mockContext: AuditContext = {
    userId: 'user-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  };

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.log(
        {
          action: AuditAction.CREATE,
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
          description: 'Created compliance rule',
          metadata: { country: 'US' },
        },
        mockContext,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
          description: 'Created compliance rule',
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      });
    });

    it('should not throw on logging failure', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(
        service.log(
          {
            action: AuditAction.CREATE,
            entityType: 'Test',
            description: 'Test description',
          },
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('logCreate', () => {
    it('should log a CREATE action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logCreate(
        'ComplianceRule',
        'rule-1',
        'Created rule',
        mockContext,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
        }),
      });
    });
  });

  describe('logUpdate', () => {
    it('should log an UPDATE action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logUpdate(
        'ComplianceRule',
        'rule-1',
        'Updated rule',
        mockContext,
        { oldValue: 'A', newValue: 'B' },
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
          metadata: { oldValue: 'A', newValue: 'B' },
        }),
      });
    });
  });

  describe('logDelete', () => {
    it('should log a DELETE action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logDelete(
        'ComplianceRule',
        'rule-1',
        'Deleted rule',
        mockContext,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE',
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
        }),
      });
    });
  });

  describe('logPublish', () => {
    it('should log a PUBLISH action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logPublish(
        'InsightsPost',
        'post-1',
        'Published post',
        mockContext,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PUBLISH',
          entityType: 'InsightsPost',
          entityId: 'post-1',
        }),
      });
    });
  });

  describe('logToggle', () => {
    it('should log a TOGGLE action', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      await service.logToggle(
        'TrendSeries',
        'series-1',
        'Toggled active status',
        mockContext,
        { isActive: true },
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TOGGLE',
          entityType: 'TrendSeries',
          entityId: 'series-1',
        }),
      });
    });
  });

  describe('listAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.listAuditLogs({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by action', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.listAuditLogs({
        skip: 0,
        take: 20,
        action: AuditAction.CREATE,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CREATE',
          }),
        }),
      );
    });

    it('should filter by entityType', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.listAuditLogs({
        skip: 0,
        take: 20,
        entityType: 'ComplianceRule',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'ComplianceRule',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      await service.listAuditLogs({
        skip: 0,
        take: 20,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });
  });

  describe('getAuditLogById', () => {
    it('should return audit log by ID', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockAuditLog);

      const result = await service.getAuditLogById('audit-1');

      expect(result).toEqual(mockAuditLog);
      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'audit-1' },
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
    });
  });

  describe('getEntityHistory', () => {
    it('should return audit history for an entity', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);

      const result = await service.getEntityHistory('ComplianceRule', 'rule-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'ComplianceRule',
          entityId: 'rule-1',
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
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);

      const result = await service.getUserActivity('user-1', 50);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });
});
