import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { COMPLIANCE_LEVELS, DEFAULT_DISCLAIMER_TEXT } from '@matcha/shared';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prismaService: PrismaService;

  // Mock data
  const mockRule1 = {
    id: 'rule-1',
    destinationCountry: 'JP',
    productCategory: 'organic-matcha',
    minDeclaredValueUsd: 1000,
    minWeightKg: null,
    maxWeightKg: null,
    requiredCertifications: ['JAS', 'organic'],
    requiredDocs: ['packing-list', 'commercial-invoice', 'phytosanitary-certificate'],
    warnings: ['Perishable item - check lead time'],
    disclaimerText: 'Japan import disclaimer text',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAdminId: 'admin-1',
  };

  const mockRule2 = {
    id: 'rule-2',
    destinationCountry: 'JP',
    productCategory: 'organic-matcha',
    minDeclaredValueUsd: 5000,
    minWeightKg: null,
    maxWeightKg: null,
    requiredCertifications: ['JAS'],
    requiredDocs: ['import-permit', 'certificate-of-origin'],
    warnings: ['Large shipment - additional inspection may apply'],
    disclaimerText: 'Japan high-value import disclaimer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAdminId: 'admin-1',
  };

  const mockRuleWeightBased = {
    id: 'rule-3',
    destinationCountry: 'US',
    productCategory: 'matcha',
    minDeclaredValueUsd: null,
    minWeightKg: 10,
    maxWeightKg: 100,
    requiredCertifications: [],
    requiredDocs: ['packing-list', 'commercial-invoice'],
    warnings: ['Weight-based rule'],
    disclaimerText: 'US import disclaimer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAdminId: 'admin-1',
  };

  const mockPrismaService = {
    complianceRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    complianceEvaluation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('evaluate', () => {
    it('should return empty result with default disclaimer when no rules match', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 500,
        weightKg: 5,
        certifications: [],
      });

      expect(result.requiredDocs).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.flags).toEqual([]);
      expect(result.disclaimerText).toBe(DEFAULT_DISCLAIMER_TEXT);
      expect(result.appliedRuleIds).toEqual([]);
      expect(result.complianceLevel).toBe(COMPLIANCE_LEVELS.LOW);
    });

    it('should match rule when declaredValue >= minDeclaredValueUsd', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 2000, // >= 1000 threshold
        weightKg: 5,
        certifications: ['JAS', 'organic'],
      });

      expect(result.appliedRuleIds).toContain('rule-1');
      expect(result.requiredDocs).toContain('packing-list');
      expect(result.requiredDocs).toContain('commercial-invoice');
      expect(result.warnings).toContain('Perishable item - check lead time');
    });

    it('should NOT match rule when declaredValue < minDeclaredValueUsd', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 500, // < 1000 threshold
        weightKg: 5,
        certifications: [],
      });

      expect(result.appliedRuleIds).toEqual([]);
      expect(result.requiredDocs).toEqual([]);
    });

    it('should aggregate docs from multiple matching rules without duplicates', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1, mockRule2]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 6000, // >= both 1000 and 5000 thresholds
        weightKg: 5,
        certifications: ['JAS', 'organic'],
      });

      expect(result.appliedRuleIds).toHaveLength(2);
      expect(result.appliedRuleIds).toContain('rule-1');
      expect(result.appliedRuleIds).toContain('rule-2');

      // Should have all unique docs from both rules
      expect(result.requiredDocs).toContain('packing-list');
      expect(result.requiredDocs).toContain('commercial-invoice');
      expect(result.requiredDocs).toContain('phytosanitary-certificate');
      expect(result.requiredDocs).toContain('import-permit');
      expect(result.requiredDocs).toContain('certificate-of-origin');

      // Ensure no duplicates
      const uniqueDocs = [...new Set(result.requiredDocs)];
      expect(result.requiredDocs.length).toBe(uniqueDocs.length);
    });

    it('should include missing certifications in flags', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 2000,
        weightKg: 5,
        certifications: ['JAS'], // Missing 'organic'
      });

      expect(result.missingCertifications).toContain('organic');
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should match weight-based rules correctly', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRuleWeightBased]);

      // Weight within range (10-100)
      const result = await service.evaluate({
        destinationCountry: 'US',
        productCategory: 'matcha',
        declaredValueUsd: 500,
        weightKg: 50, // Within 10-100 range
        certifications: [],
      });

      expect(result.appliedRuleIds).toContain('rule-3');
    });

    it('should NOT match when weight is below minWeightKg', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRuleWeightBased]);

      const result = await service.evaluate({
        destinationCountry: 'US',
        productCategory: 'matcha',
        declaredValueUsd: 500,
        weightKg: 5, // Below 10 minimum
        certifications: [],
      });

      expect(result.appliedRuleIds).toEqual([]);
    });

    it('should NOT match when weight exceeds maxWeightKg', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRuleWeightBased]);

      const result = await service.evaluate({
        destinationCountry: 'US',
        productCategory: 'matcha',
        declaredValueUsd: 500,
        weightKg: 150, // Exceeds 100 maximum
        certifications: [],
      });

      expect(result.appliedRuleIds).toEqual([]);
    });

    it('should throw NotFoundException for invalid country code', async () => {
      await expect(
        service.evaluate({
          destinationCountry: 'XX', // Invalid code
          productCategory: 'matcha',
          declaredValueUsd: 500,
          weightKg: 5,
          certifications: [],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should determine compliance level based on rule count', async () => {
      // Single rule = LOW
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);
      let result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 2000,
        weightKg: 5,
        certifications: ['JAS', 'organic'],
      });
      expect(result.complianceLevel).toBe(COMPLIANCE_LEVELS.LOW);

      // Two rules = MEDIUM
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1, mockRule2]);
      result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 6000,
        weightKg: 5,
        certifications: ['JAS', 'organic'],
      });
      expect(result.complianceLevel).toBe(COMPLIANCE_LEVELS.MEDIUM);

      // Three or more rules = HIGH
      mockPrismaService.complianceRule.findMany.mockResolvedValue([
        mockRule1,
        mockRule2,
        mockRuleWeightBased,
      ]);
      result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 6000,
        weightKg: 50,
        certifications: ['JAS', 'organic'],
      });
      expect(result.complianceLevel).toBe(COMPLIANCE_LEVELS.HIGH);
    });

    it('should set HIGH compliance level when there are flags', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);

      const result = await service.evaluate({
        destinationCountry: 'JP',
        productCategory: 'organic-matcha',
        declaredValueUsd: 2000,
        weightKg: 5,
        certifications: [], // Missing required certs = flags
      });

      expect(result.complianceLevel).toBe(COMPLIANCE_LEVELS.HIGH);
    });
  });

  describe('createRule', () => {
    it('should create a compliance rule with valid input', async () => {
      const input = {
        destinationCountry: 'JP',
        productCategory: 'matcha',
        requiredDocs: ['packing-list', 'commercial-invoice'],
        warnings: [],
        requiredCertifications: [],
        disclaimerText: 'Test disclaimer',
        isActive: true,
      };

      mockPrismaService.complianceRule.create.mockResolvedValue({
        id: 'new-rule-id',
        ...input,
        destinationCountry: 'JP',
        minDeclaredValueUsd: null,
        minWeightKg: null,
        maxWeightKg: null,
        requiredCertifications: [],
        warnings: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByAdminId: 'admin-1',
      });

      const result = await service.createRule(input, 'admin-1');

      expect(result.id).toBe('new-rule-id');
      expect(result.destinationCountry).toBe('JP');
      expect(mockPrismaService.complianceRule.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid country code', async () => {
      await expect(
        service.createRule(
          {
            destinationCountry: 'XX',
            productCategory: 'matcha',
            requiredDocs: ['packing-list'],
            warnings: [],
            requiredCertifications: [],
            disclaimerText: 'Test',
            isActive: true,
          },
          'admin-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize disclaimer text (remove script tags)', async () => {
      const input = {
        destinationCountry: 'JP',
        productCategory: 'matcha',
        requiredDocs: ['packing-list'],
        warnings: [],
        requiredCertifications: [],
        disclaimerText: 'Safe text <script>alert("xss")</script> more text',
        isActive: true,
      };

      mockPrismaService.complianceRule.create.mockImplementation((args: any) => ({
        id: 'rule-id',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await service.createRule(input, 'admin-1');

      const createCall = mockPrismaService.complianceRule.create.mock.calls[0][0];
      expect(createCall.data.disclaimerText).not.toContain('<script>');
      expect(createCall.data.disclaimerText).toContain('Safe text');
      expect(createCall.data.disclaimerText).toContain('more text');
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(mockRule1);
      mockPrismaService.complianceRule.update.mockResolvedValue({
        ...mockRule1,
        minDeclaredValueUsd: 3000,
      });

      const result = await service.updateRule(
        'rule-1',
        { minDeclaredValueUsd: 3000 },
        'admin-1'
      );

      expect(result.minDeclaredValueUsd).toBe(3000);
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRule('non-existent', { minDeclaredValueUsd: 1000 }, 'admin-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRule', () => {
    it('should soft delete a rule by setting isActive to false', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(mockRule1);
      mockPrismaService.complianceRule.update.mockResolvedValue({
        ...mockRule1,
        isActive: false,
      });

      await service.deleteRule('rule-1');

      expect(mockPrismaService.complianceRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(null);

      await expect(service.deleteRule('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listRules', () => {
    it('should return paginated rules', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);
      mockPrismaService.complianceRule.count.mockResolvedValue(1);

      const result = await service.listRules({
        skip: 0,
        take: 20,
        activeOnly: true,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by destination country', async () => {
      mockPrismaService.complianceRule.findMany.mockResolvedValue([mockRule1]);
      mockPrismaService.complianceRule.count.mockResolvedValue(1);

      await service.listRules({
        destinationCountry: 'JP',
        skip: 0,
        take: 20,
        activeOnly: true,
      });

      expect(mockPrismaService.complianceRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            destinationCountry: 'JP',
          }),
        })
      );
    });
  });

  describe('getRule', () => {
    it('should return a rule by ID', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(mockRule1);

      const result = await service.getRule('rule-1');

      expect(result.id).toBe('rule-1');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrismaService.complianceRule.findUnique.mockResolvedValue(null);

      await expect(service.getRule('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('saveEvaluation', () => {
    it('should save a compliance evaluation for audit', async () => {
      const evaluationData = {
        destinationCountry: 'JP',
        productCategory: 'matcha',
        declaredValueUsd: 2000,
        weightKg: 5,
        rfqId: 'rfq-1',
        result: {
          requiredDocs: ['packing-list'],
          warnings: [],
          flags: [],
          disclaimerText: 'Test disclaimer',
          appliedRuleIds: ['rule-1'],
          complianceLevel: 'low' as const,
        },
      };

      mockPrismaService.complianceEvaluation.create.mockResolvedValue({
        id: 'eval-1',
        ...evaluationData,
        ...evaluationData.result,
        evaluatedAt: new Date(),
      });

      await service.saveEvaluation(evaluationData);

      expect(mockPrismaService.complianceEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rfqId: 'rfq-1',
          destinationCountry: 'JP',
          productCategory: 'matcha',
        }),
      });
    });
  });
});
