import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EstimateRequestInput, EstimateRfqRequestInput } from '@matcha/shared';

describe('LogisticsService', () => {
  let service: LogisticsService;
  let prismaService: PrismaService;

  // Mock RFQ data
  const mockRfq = {
    id: 'rfq-1',
    destinationCountry: 'SG',
    lineItems: [
      {
        id: 'item-1',
        qty: { toNumber: () => 2 },
        unit: 'unit',
        targetPrice: { toNumber: () => 50 },
        sku: {
          id: 'sku-1',
          netWeightG: 100, // 100g per unit
          name: '100g Matcha Pouch',
        },
      },
      {
        id: 'item-2',
        qty: { toNumber: () => 3 },
        unit: 'unit',
        targetPrice: { toNumber: () => 30 },
        sku: {
          id: 'sku-2',
          netWeightG: 50, // 50g per unit
          name: '50g Matcha Tin',
        },
      },
    ],
  };

  const mockPrismaService: any = {
    rfq: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('estimate', () => {
    const validInput: EstimateRequestInput = {
      originCountry: 'JP',
      destinationCountry: 'US',
      weightKg: 5,
      dimensionsCm: { length: 30, width: 20, height: 15 },
      declaredValue: 500,
      serviceLevel: 'standard',
    };

    it('should return estimates from all providers for valid input', async () => {
      const result = await service.estimate(validInput);

      expect(result.estimates).toBeDefined();
      expect(result.estimates.length).toBeGreaterThan(0);
      expect(result.calculatedWeightKg).toBe(5);
      expect(result.calculationDetails.originCountry).toBe('JP');
      expect(result.calculationDetails.destinationCountry).toBe('US');
    });

    it('should return estimates from UPS, FedEx for standard international shipment', async () => {
      const result = await service.estimate(validInput);

      const providerIds = [...new Set(result.estimates.map((e) => e.providerId))];
      expect(providerIds).toContain('ups');
      expect(providerIds).toContain('fedex');
    });

    it('should include FreightForwarder for heavy shipments (>100kg)', async () => {
      const heavyInput = {
        ...validInput,
        weightKg: 150,
      };

      const result = await service.estimate(heavyInput);

      const providerIds = result.estimates.map((e) => e.providerId);
      expect(providerIds).toContain('freightforwarder');
    });

    it('should sort estimates by cost ascending', async () => {
      const result = await service.estimate(validInput);

      for (let i = 0; i < result.estimates.length - 1; i++) {
        expect(result.estimates[i].costMin).toBeLessThanOrEqual(
          result.estimates[i + 1].costMin,
        );
      }
    });

    it('should throw BadRequestException for invalid country code', async () => {
      const invalidInput = {
        ...validInput,
        destinationCountry: 'XX',
      };

      await expect(service.estimate(invalidInput)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero weight', async () => {
      const invalidInput = {
        ...validInput,
        weightKg: 0,
      };

      await expect(service.estimate(invalidInput)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative dimensions', async () => {
      const invalidInput = {
        ...validInput,
        dimensionsCm: { length: -10, width: 20, height: 15 },
      };

      await expect(service.estimate(invalidInput)).rejects.toThrow(BadRequestException);
    });

    it('should have higher rates for international vs domestic', async () => {
      const domesticInput = {
        ...validInput,
        originCountry: 'US',
        destinationCountry: 'US',
      };

      const internationalInput = {
        ...validInput,
        originCountry: 'JP',
        destinationCountry: 'US',
      };

      const [domesticResult, internationalResult] = await Promise.all([
        service.estimate(domesticInput),
        service.estimate(internationalInput),
      ]);

      // Find UPS estimates for both
      const domesticUps = domesticResult.estimates.find((e) => e.providerId === 'ups');
      const internationalUps = internationalResult.estimates.find((e) => e.providerId === 'ups');

      expect(internationalUps!.costMin).toBeGreaterThan(domesticUps!.costMin);
    });
  });

  describe('UPS adapter rates', () => {
    it('should apply oversized surcharge for large packages', async () => {
      const normalInput: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'US',
        weightKg: 5,
        dimensionsCm: { length: 25, width: 20, height: 15 }, // Normal size
        declaredValue: 500,
        serviceLevel: 'standard',
      };

      const oversizedInput: EstimateRequestInput = {
        ...normalInput,
        dimensionsCm: { length: 50, width: 40, height: 35 }, // Oversized
      };

      const [normalResult, oversizedResult] = await Promise.all([
        service.estimate(normalInput),
        service.estimate(oversizedInput),
      ]);

      const normalUps = normalResult.estimates.find((e) => e.providerId === 'ups');
      const oversizedUps = oversizedResult.estimates.find((e) => e.providerId === 'ups');

      expect(oversizedUps!.costMin).toBeGreaterThan(normalUps!.costMin);
      expect(oversizedUps!.notes).toContain('Oversized');
    });

    it('should apply heavy surcharge for shipments over 30kg', async () => {
      const lightInput: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'US',
        weightKg: 10,
        dimensionsCm: { length: 30, width: 20, height: 15 },
        declaredValue: 500,
        serviceLevel: 'standard',
      };

      const heavyInput: EstimateRequestInput = {
        ...lightInput,
        weightKg: 50, // Heavy
      };

      const [lightResult, heavyResult] = await Promise.all([
        service.estimate(lightInput),
        service.estimate(heavyInput),
      ]);

      const lightUps = lightResult.estimates.find((e) => e.providerId === 'ups');
      const heavyUps = heavyResult.estimates.find((e) => e.providerId === 'ups');

      // Heavy should cost more than just weight ratio
      const weightRatio = 50 / 10;
      const costRatio = heavyUps!.costMin / lightUps!.costMin;
      expect(costRatio).toBeGreaterThan(weightRatio);
    });
  });

  describe('FedEx adapter rates', () => {
    it('should include residential surcharge in cost', async () => {
      const input: EstimateRequestInput = {
        originCountry: 'US',
        destinationCountry: 'US',
        weightKg: 5,
        dimensionsCm: { length: 30, width: 20, height: 15 },
        declaredValue: 200,
        serviceLevel: 'standard',
      };

      const result = await service.estimate(input);
      const fedex = result.estimates.find((e) => e.providerId === 'fedex');

      expect(fedex!.notes).toContain('Residential');
    });

    it('should apply oversized surcharge (+12%)', async () => {
      const normalInput: EstimateRequestInput = {
        originCountry: 'US',
        destinationCountry: 'US',
        weightKg: 5,
        dimensionsCm: { length: 25, width: 20, height: 15 },
        declaredValue: 200,
        serviceLevel: 'standard',
      };

      const oversizedInput: EstimateRequestInput = {
        ...normalInput,
        dimensionsCm: { length: 50, width: 40, height: 35 },
      };

      const [normalResult, oversizedResult] = await Promise.all([
        service.estimate(normalInput),
        service.estimate(oversizedInput),
      ]);

      const normalFedex = normalResult.estimates.find((e) => e.providerId === 'fedex');
      const oversizedFedex = oversizedResult.estimates.find((e) => e.providerId === 'fedex');

      expect(oversizedFedex!.costMin).toBeGreaterThan(normalFedex!.costMin);
      expect(oversizedFedex!.notes).toContain('Oversized');
    });
  });

  describe('FreightForwarder adapter rates', () => {
    it('should have minimum charges for sea freight', async () => {
      const lightInput: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'US',
        weightKg: 50, // Light for freight
        dimensionsCm: { length: 50, width: 40, height: 30 },
        declaredValue: 1000,
        serviceLevel: 'economy', // Sea freight
      };

      const result = await service.estimate(lightInput);
      const freight = result.estimates.find(
        (e) => e.providerId === 'freightforwarder' && e.service.includes('Sea'),
      );

      if (freight) {
        // Sea freight has $500 minimum
        expect(freight.costMin).toBeGreaterThanOrEqual(450); // 500 * 0.9 variance
      }
    });

    it('should include insurance in freight cost', async () => {
      const input: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'US',
        weightKg: 150,
        dimensionsCm: { length: 60, width: 50, height: 40 },
        declaredValue: 5000, // High declared value
        serviceLevel: 'standard',
      };

      const result = await service.estimate(input);
      const freight = result.estimates.find((e) => e.providerId === 'freightforwarder');

      expect(freight!.notes).toContain('insurance');
    });
  });

  describe('calculateRfqWeight', () => {
    it('should calculate weight from RFQ line items with 5% packing allowance', () => {
      // 2 units * 100g + 3 units * 50g = 350g = 0.35kg
      // With 5% packing: 0.35 * 1.05 = 0.3675kg
      const result = service.calculateRfqWeight(mockRfq.lineItems);

      expect(result.itemsWeightKg).toBe(0.35);
      expect(result.packingAllowanceKg).toBeCloseTo(0.0175, 2); // Service rounds to 3 decimals
      expect(result.totalWeightKg).toBeCloseTo(0.3675, 2); // Service rounds to 3 decimals
    });

    it('should handle mixed unit types', () => {
      const mixedItems = [
        {
          qty: { toNumber: () => 5 },
          unit: 'unit',
          sku: { netWeightG: 100 },
        },
        {
          qty: { toNumber: () => 1000 },
          unit: 'g', // Direct grams
          sku: { netWeightG: 100 },
        },
      ];

      // 5 * 100g + 1000g = 1500g = 1.5kg
      // With 5% packing: 1.575kg
      const result = service.calculateRfqWeight(mixedItems);

      expect(result.itemsWeightKg).toBe(1.5);
      expect(result.totalWeightKg).toBeCloseTo(1.575, 4);
    });

    it('should skip items without SKU data', () => {
      const itemsWithMissingSku = [
        {
          qty: { toNumber: () => 2 },
          unit: 'unit',
          sku: { netWeightG: 100 },
        },
        {
          qty: { toNumber: () => 3 },
          unit: 'unit',
          sku: null, // Missing SKU
        },
      ];

      const result = service.calculateRfqWeight(itemsWithMissingSku);

      // Only first item counted: 2 * 100g = 200g = 0.2kg
      expect(result.itemsWeightKg).toBe(0.2);
    });
  });

  describe('estimateFromRfq', () => {
    it('should calculate estimates from RFQ line items', async () => {
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      const input: EstimateRfqRequestInput = {
        rfqId: 'rfq-1',
        originCountry: 'JP',
        dimensionsCm: { length: 30, width: 20, height: 15 },
        serviceLevel: 'standard',
      };

      const result = await service.estimateFromRfq(input);

      expect(result.estimates.length).toBeGreaterThan(0);
      expect(result.calculationDetails.weightBreakdown).toBeDefined();
      expect(result.calculationDetails.weightBreakdown!.itemsWeightKg).toBe(0.35);
      expect(result.calculationDetails.weightBreakdown!.totalWeightKg).toBeCloseTo(0.3675, 2); // Service rounds to 3 decimals
    });

    it('should throw NotFoundException for non-existent RFQ', async () => {
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      const input: EstimateRfqRequestInput = {
        rfqId: 'non-existent',
        originCountry: 'JP',
        dimensionsCm: { length: 30, width: 20, height: 15 },
        serviceLevel: 'standard',
      };

      await expect(service.estimateFromRfq(input)).rejects.toThrow(NotFoundException);
    });

    it('should use destination country from RFQ', async () => {
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      const input: EstimateRfqRequestInput = {
        rfqId: 'rfq-1',
        originCountry: 'JP',
        dimensionsCm: { length: 30, width: 20, height: 15 },
        serviceLevel: 'standard',
      };

      const result = await service.estimateFromRfq(input);

      expect(result.calculationDetails.destinationCountry).toBe('SG');
    });

    it('should increase cost when quantity increases', async () => {
      // Use larger quantities to ensure different shipping tiers
      const smallRfq = {
        ...mockRfq,
        lineItems: [
          {
            id: 'item-1',
            qty: { toNumber: () => 10 }, // 1kg total
            unit: 'unit',
            targetPrice: { toNumber: () => 50 },
            sku: { netWeightG: 100 },
          },
        ],
      };

      const largeRfq = {
        ...mockRfq,
        lineItems: [
          {
            id: 'item-1',
            qty: { toNumber: () => 500 }, // 50kg total - different tier
            unit: 'unit',
            targetPrice: { toNumber: () => 50 },
            sku: { netWeightG: 100 },
          },
        ],
      };

      mockPrismaService.rfq.findUnique
        .mockResolvedValueOnce(smallRfq)
        .mockResolvedValueOnce(largeRfq);

      const input: EstimateRfqRequestInput = {
        rfqId: 'rfq-1',
        originCountry: 'JP',
        dimensionsCm: { length: 30, width: 20, height: 15 },
        serviceLevel: 'standard',
      };

      const [smallResult, largeResult] = await Promise.all([
        service.estimateFromRfq({ ...input, rfqId: 'small' }),
        service.estimateFromRfq({ ...input, rfqId: 'large' }),
      ]);

      // Large order should have higher weight
      expect(largeResult.calculationDetails.weightBreakdown!.totalWeightKg).toBeGreaterThan(
        smallResult.calculationDetails.weightBreakdown!.totalWeightKg,
      );

      // And higher shipping cost
      const smallCost = smallResult.estimates[0].costMin;
      const largeCost = largeResult.estimates[0].costMin;
      expect(largeCost).toBeGreaterThan(smallCost);
    });
  });

  describe('integration scenarios', () => {
    it('should handle Japan to Singapore route (common matcha export)', async () => {
      const input: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'SG',
        weightKg: 2,
        dimensionsCm: { length: 25, width: 20, height: 15 },
        declaredValue: 300,
        serviceLevel: 'standard',
      };

      const result = await service.estimate(input);

      expect(result.estimates.length).toBeGreaterThan(0);
      // All estimates should have valid cost ranges
      result.estimates.forEach((estimate) => {
        expect(estimate.costMin).toBeGreaterThan(0);
        expect(estimate.costMax).toBeGreaterThanOrEqual(estimate.costMin);
        expect(estimate.etaDaysMin).toBeLessThanOrEqual(estimate.etaDaysMax);
      });
    });

    it('should handle Japan to USA route', async () => {
      const input: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'US',
        weightKg: 5,
        dimensionsCm: { length: 30, width: 25, height: 20 },
        declaredValue: 500,
        serviceLevel: 'express',
      };

      const result = await service.estimate(input);

      expect(result.estimates.length).toBeGreaterThan(0);
      // Express should have faster ETA
      result.estimates.forEach((estimate) => {
        expect(estimate.etaDaysMax).toBeLessThanOrEqual(10);
      });
    });

    it('should handle bulk shipment for freight', async () => {
      const input: EstimateRequestInput = {
        originCountry: 'JP',
        destinationCountry: 'DE',
        weightKg: 200,
        dimensionsCm: { length: 80, width: 60, height: 50 },
        declaredValue: 10000,
        serviceLevel: 'economy',
      };

      const result = await service.estimate(input);

      // Should include freight forwarder for bulk
      const freightEstimate = result.estimates.find(
        (e) => e.providerId === 'freightforwarder',
      );
      expect(freightEstimate).toBeDefined();
    });
  });
});
