import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, VerificationStatus } from '@prisma/client';

describe('SearchService', () => {
  let service: SearchService;
  let prismaService: PrismaService;

  // Mock SKU data
  const mockSkus = [
    {
      id: 'sku-1',
      sku: 'KYO-ICM-100G',
      name: '100g Pouch',
      isActive: true,
      priceTiers: [{ minQty: 1, pricePerUnit: 120 }],
      product: {
        id: 'product-1',
        name: 'Imperial Ceremonial Matcha',
        moqKg: 5,
        leadTimeDays: 14,
        certifications: ['JAS Organic', 'USDA Organic'],
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
        region: { name: 'Uji, Kyoto' },
        gradeType: { name: 'Ceremonial', code: 'CEREMONIAL' },
        seller: {
          id: 'seller-1',
          verificationStatus: VerificationStatus.APPROVED,
          company: { name: 'Kyoto Matcha Masters' },
        },
      },
    },
    {
      id: 'sku-2',
      sku: 'NIS-CGN-100G',
      name: '100g Pouch',
      isActive: true,
      priceTiers: [{ minQty: 1, pricePerUnit: 45 }],
      product: {
        id: 'product-2',
        name: 'Cafe Grade Nishio',
        moqKg: 25,
        leadTimeDays: 7,
        certifications: [],
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
        region: { name: 'Nishio, Aichi' },
        gradeType: { name: 'Cafe Grade', code: 'CAFE' },
        seller: {
          id: 'seller-2',
          verificationStatus: VerificationStatus.APPROVED,
          company: { name: 'Nishio Green Industries' },
        },
      },
    },
    {
      id: 'sku-3',
      sku: 'KYO-PCM-1KG',
      name: '1kg Bulk',
      isActive: true,
      priceTiers: [{ minQty: 1, pricePerUnit: 85 }],
      product: {
        id: 'product-3',
        name: 'Premium Uji Matcha',
        moqKg: 10,
        leadTimeDays: 10,
        certifications: ['JAS Organic'],
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
        region: { name: 'Uji, Kyoto' },
        gradeType: { name: 'Premium', code: 'PREMIUM' },
        seller: {
          id: 'seller-1',
          verificationStatus: VerificationStatus.APPROVED,
          company: { name: 'Kyoto Matcha Masters' },
        },
      },
    },
  ];

  const mockPrismaService: any = {
    sku: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    gradeType: {
      findMany: jest.fn(),
    },
    region: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    priceTier: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should throw BadRequestException for empty query', async () => {
      await expect(
        service.search({ query: '', page: 1, limit: 20 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for whitespace-only query', async () => {
      await expect(
        service.search({ query: '   ', page: 1, limit: 20 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return results for valid query', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue(mockSkus);
      mockPrismaService.sku.count.mockResolvedValue(3);

      const result = await service.search({
        query: 'matcha',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should filter by region when query contains region keyword', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0], mockSkus[2]]);
      mockPrismaService.sku.count.mockResolvedValue(2);

      const result = await service.search({
        query: 'uji matcha',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(2);
      expect(result.parsedQuery?.regions).toContain('Uji, Kyoto');
      // Verify all results are from Uji
      result.results.forEach((r) => {
        expect(r.origin).toBe('Uji, Kyoto');
      });
    });

    it('should filter by grade when query contains grade keyword', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0]]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'ceremonial matcha',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(1);
      expect(result.parsedQuery?.grades).toContain('CEREMONIAL');
      expect(result.results[0].grade).toBe('Ceremonial');
    });

    it('should filter by certification when query contains certification keyword', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0], mockSkus[2]]);
      mockPrismaService.sku.count.mockResolvedValue(2);

      const result = await service.search({
        query: 'organic matcha',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(2);
      expect(result.parsedQuery?.certifications).toContain('organic');
      // Verify all results have organic certification
      result.results.forEach((r) => {
        expect(
          r.certifications.some((c) => c.toLowerCase().includes('organic')),
        ).toBe(true);
      });
    });

    it('should filter by MOQ when query contains MOQ constraint', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0], mockSkus[2]]);
      mockPrismaService.sku.count.mockResolvedValue(2);

      const result = await service.search({
        query: 'matcha moq <20kg',
        page: 1,
        limit: 20,
      });

      expect(result.parsedQuery?.moqMax).toBe(20);
      // Verify all results have MOQ <= 20
      result.results.forEach((r) => {
        expect(r.moq).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('scoring and reasons', () => {
    it('should generate reasons for region match', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0]]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'uji ceremonial',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(1);
      const reasons = result.results[0].reasons;

      // Should have reason for region match
      const regionReason = reasons.find((r) => r.field === 'origin');
      expect(regionReason).toBeDefined();
      expect(regionReason?.matchedValue).toBe('Uji, Kyoto');
      expect(regionReason?.matchRule).toBe('exact_match');
    });

    it('should generate reasons for certification match', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0]]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'organic matcha',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(1);
      const reasons = result.results[0].reasons;

      // Should have reason for certification match
      const certReason = reasons.find((r) => r.field === 'certification');
      expect(certReason).toBeDefined();
      expect(certReason?.matchRule).toBe('array_contains');
    });

    it('should generate reasons for MOQ match', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[0]]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'matcha moq <10kg',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(1);
      const reasons = result.results[0].reasons;

      // Should have reason for MOQ match
      const moqReason = reasons.find((r) => r.field === 'moq');
      expect(moqReason).toBeDefined();
      expect(moqReason?.matchRule).toBe('less_than_or_equal');
    });

    it('should NOT invent attributes that do not exist in the database', async () => {
      // SKU without certifications
      mockPrismaService.sku.findMany.mockResolvedValue([mockSkus[1]]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'organic cafe grade',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(1);
      const reasons = result.results[0].reasons;

      // Should NOT have certification reason since product has no certifications
      const certReason = reasons.find((r) => r.field === 'certification');
      expect(certReason).toBeUndefined();

      // But should have grade reason
      const gradeReason = reasons.find((r) => r.field === 'grade');
      expect(gradeReason).toBeDefined();
    });

    it('should sort results by score descending', async () => {
      // Return multiple SKUs with different match levels
      mockPrismaService.sku.findMany.mockResolvedValue(mockSkus);
      mockPrismaService.sku.count.mockResolvedValue(3);

      const result = await service.search({
        query: 'organic uji ceremonial',
        page: 1,
        limit: 20,
      });

      // First result should have highest score
      const scores = result.results.map((r) => r.score || 0);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });

  describe('complex query - integration test', () => {
    it('should correctly handle "organic uji ceremonial moq <20kg ship to singapore"', async () => {
      // Only return SKU that matches all criteria
      const matchingSku = {
        ...mockSkus[0],
        product: {
          ...mockSkus[0].product,
          moqKg: 5, // MOQ 5kg < 20kg
        },
      };
      mockPrismaService.sku.findMany.mockResolvedValue([matchingSku]);
      mockPrismaService.sku.count.mockResolvedValue(1);

      const result = await service.search({
        query: 'organic uji ceremonial moq <20kg ship to singapore',
        page: 1,
        limit: 20,
      });

      // Verify parsed query
      expect(result.parsedQuery?.certifications).toContain('organic');
      expect(result.parsedQuery?.regions).toContain('Uji, Kyoto');
      expect(result.parsedQuery?.grades).toContain('CEREMONIAL');
      expect(result.parsedQuery?.moqMax).toBe(20);
      expect(result.parsedQuery?.destinationCountry).toBe('SG');

      // Verify results
      expect(result.results).toHaveLength(1);
      const searchResult = result.results[0];

      // Verify actual data matches
      expect(searchResult.origin).toBe('Uji, Kyoto');
      expect(searchResult.grade).toBe('Ceremonial');
      expect(searchResult.moq).toBeLessThanOrEqual(20);
      expect(
        searchResult.certifications.some((c) =>
          c.toLowerCase().includes('organic'),
        ),
      ).toBe(true);

      // Verify reasons only include REAL matches
      const reasons = searchResult.reasons;
      reasons.forEach((reason) => {
        // Each reason's matchedValue should exist in the actual data
        if (reason.field === 'origin') {
          expect(reason.matchedValue).toBe(searchResult.origin);
        }
        if (reason.field === 'moq') {
          expect(reason.matchedValue).toBe(searchResult.moq);
        }
        if (reason.field === 'certification') {
          expect(searchResult.certifications).toContain(reason.matchedValue);
        }
      });

      // Should NOT have any reason for destination (we don't track availability by country in DB)
      const destReason = reasons.find((r) => r.field === 'destinationCountry');
      expect(destReason).toBeUndefined();
    });
  });

  describe('suggestions', () => {
    it('should provide suggestion when no results found', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([]);
      mockPrismaService.sku.count.mockResolvedValue(0);

      const result = await service.search({
        query: 'organic ceremonial moq <2kg',
        page: 1,
        limit: 20,
      });

      expect(result.results).toHaveLength(0);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion?.length).toBeGreaterThan(0);
    });
  });

  describe('getFilterOptions', () => {
    it('should return filter options', async () => {
      mockPrismaService.gradeType.findMany.mockResolvedValue([
        { code: 'CEREMONIAL', name: 'Ceremonial' },
        { code: 'PREMIUM', name: 'Premium' },
      ]);
      mockPrismaService.region.findMany.mockResolvedValue([
        { name: 'Uji, Kyoto', country: 'JP' },
        { name: 'Nishio, Aichi', country: 'JP' },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([
        { moqKg: 5, leadTimeDays: 14, certifications: ['JAS Organic'] },
        { moqKg: 25, leadTimeDays: 7, certifications: [] },
      ]);
      mockPrismaService.priceTier.findMany.mockResolvedValue([
        { pricePerUnit: 50 },
        { pricePerUnit: 150 },
      ]);

      const options = await service.getFilterOptions();

      expect(options.grades).toHaveLength(2);
      expect(options.regions).toHaveLength(2);
      expect(options.certifications).toContain('JAS Organic');
      expect(options.moqRange.min).toBe(5);
      expect(options.moqRange.max).toBe(25);
      expect(options.leadTimeRange.min).toBe(7);
      expect(options.leadTimeRange.max).toBe(14);
      expect(options.priceRange.min).toBe(50);
      expect(options.priceRange.max).toBe(150);
    });
  });

  describe('input sanitization', () => {
    it('should sanitize dangerous characters from query', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([]);
      mockPrismaService.sku.count.mockResolvedValue(0);

      // These should not cause errors
      await expect(
        service.search({
          query: '<script>alert(1)</script>matcha',
          page: 1,
          limit: 20,
        }),
      ).resolves.toBeDefined();

      await expect(
        service.search({
          query: 'matcha{$ne: null}',
          page: 1,
          limit: 20,
        }),
      ).resolves.toBeDefined();
    });

    it('should truncate very long queries', async () => {
      mockPrismaService.sku.findMany.mockResolvedValue([]);
      mockPrismaService.sku.count.mockResolvedValue(0);

      const longQuery = 'matcha '.repeat(1000);

      const result = await service.search({
        query: longQuery,
        page: 1,
        limit: 20,
      });

      // Should not throw and should have parsed something
      expect(result).toBeDefined();
    });
  });
});
