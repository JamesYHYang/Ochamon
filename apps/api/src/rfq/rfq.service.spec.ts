import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RfqService } from './rfq.service';
import { PrismaService } from '../prisma/prisma.service';
import { RfqStatus } from '@prisma/client';

describe('RfqService', () => {
  let service: RfqService;
  let prismaService: PrismaService;

  // Mock data
  const mockBuyerProfile = {
    id: 'buyer-profile-123',
    userId: 'user-buyer-123',
    company: { name: 'Buyer Company' },
    user: { name: 'Buyer User', email: 'buyer@example.com' },
  };

  const mockSellerProfile = {
    id: 'seller-profile-456',
    userId: 'user-seller-456',
    company: { name: 'Seller Company' },
  };

  const mockOtherSellerProfile = {
    id: 'seller-profile-789',
    userId: 'user-seller-789',
    company: { name: 'Other Seller Company' },
  };

  const mockSku = {
    id: 'sku-123',
    sku: 'MAT-001',
    name: 'Premium Matcha 100g',
    isActive: true,
    product: {
      id: 'product-123',
      name: 'Premium Matcha',
      sellerId: mockSellerProfile.id,
      seller: {
        id: mockSellerProfile.id,
        company: { name: 'Seller Company' },
      },
      images: [],
    },
    priceTiers: [],
    inventory: null,
  };

  const mockOtherSku = {
    id: 'sku-456',
    sku: 'MAT-002',
    name: 'Standard Matcha 50g',
    isActive: true,
    product: {
      id: 'product-456',
      name: 'Standard Matcha',
      sellerId: mockOtherSellerProfile.id,
      seller: {
        id: mockOtherSellerProfile.id,
        company: { name: 'Other Seller Company' },
      },
      images: [],
    },
  };

  const mockRfq = {
    id: 'rfq-123',
    rfqNumber: 'RFQ-001',
    title: 'Test RFQ',
    notes: 'Test notes',
    status: RfqStatus.SUBMITTED,
    destinationCountry: 'USA',
    destinationCity: 'Los Angeles',
    incoterm: 'FOB',
    neededByDate: new Date('2025-06-01'),
    expiresAt: new Date('2025-05-01'),
    submittedAt: new Date(),
    createdAt: new Date(),
    buyerProfileId: mockBuyerProfile.id,
    buyerProfile: mockBuyerProfile,
    lineItems: [
      {
        id: 'line-item-1',
        skuId: mockSku.id,
        qty: 10,
        unit: 'kg',
        notes: null,
        targetPrice: 50,
        sku: mockSku,
      },
    ],
    quotes: [],
    messageThread: null,
    _count: { quotes: 0 },
  };

  const mockPrismaService = {
    buyerProfile: {
      findUnique: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
    },
    rfq: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RfqService>(RfqService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createRfq', () => {
    const createRfqDto = {
      title: 'New RFQ',
      destinationCountry: 'USA',
      destinationCity: 'New York',
      incoterm: 'FOB' as const,
      neededByDate: '2025-06-01',
      notes: 'Please provide best price',
      lineItems: [
        { skuId: 'sku-123', qty: 10, unit: 'kg', notes: 'Urgent' },
      ],
    };

    it('should create an RFQ successfully for a buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([mockSku]);
      mockPrismaService.rfq.create.mockResolvedValue({
        ...mockRfq,
        title: createRfqDto.title,
        lineItems: [
          {
            ...mockRfq.lineItems[0],
            notes: 'Urgent',
          },
        ],
      });

      const result = await service.createRfq('user-buyer-123', createRfqDto);

      expect(result.title).toBe('New RFQ');
      expect(mockPrismaService.buyerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-buyer-123' },
      });
      expect(mockPrismaService.rfq.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.createRfq('non-buyer-user', createRfqDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if SKU not found or inactive', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([]); // No SKUs found

      await expect(service.createRfq('user-buyer-123', createRfqDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if some SKUs are inactive', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      // Return fewer SKUs than requested (simulating inactive or missing SKUs)
      mockPrismaService.sku.findMany.mockResolvedValue([]);

      const dtoWithMultipleSkus = {
        ...createRfqDto,
        lineItems: [
          { skuId: 'sku-123', qty: 10, unit: 'kg' },
          { skuId: 'sku-inactive', qty: 5, unit: 'kg' },
        ],
      };

      await expect(service.createRfq('user-buyer-123', dtoWithMultipleSkus)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBuyerRfqs', () => {
    it('should return RFQs for the buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.rfq.findMany.mockResolvedValue([mockRfq]);

      const result = await service.getBuyerRfqs('user-buyer-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rfq-123');
      expect(mockPrismaService.rfq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerProfileId: mockBuyerProfile.id },
        }),
      );
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerRfqs('non-buyer-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty array if buyer has no RFQs', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.rfq.findMany.mockResolvedValue([]);

      const result = await service.getBuyerRfqs('user-buyer-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBuyerRfqDetail', () => {
    it('should return RFQ detail for the owner buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      const result = await service.getBuyerRfqDetail('user-buyer-123', 'rfq-123');

      expect(result.id).toBe('rfq-123');
      expect(result.title).toBe('Test RFQ');
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerRfqDetail('non-buyer', 'rfq-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerRfqDetail('user-buyer-123', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if RFQ belongs to different buyer', async () => {
      const otherBuyerProfile = { ...mockBuyerProfile, id: 'other-buyer-profile' };
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(otherBuyerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq); // RFQ belongs to mockBuyerProfile

      await expect(service.getBuyerRfqDetail('other-buyer', 'rfq-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSellerRfqs', () => {
    it('should return RFQs containing seller\'s SKUs', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.rfq.findMany.mockResolvedValue([mockRfq]);

      const result = await service.getSellerRfqs('user-seller-456');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rfq-123');
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerRfqs('non-seller-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty array if no RFQs contain seller\'s SKUs', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.rfq.findMany.mockResolvedValue([]);

      const result = await service.getSellerRfqs('user-seller-456');

      expect(result).toHaveLength(0);
    });

    it('should filter to only show relevant statuses', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.rfq.findMany.mockResolvedValue([mockRfq]);

      await service.getSellerRfqs('user-seller-456');

      expect(mockPrismaService.rfq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [RfqStatus.SUBMITTED, RfqStatus.QUOTED, RfqStatus.PARTIALLY_QUOTED] },
          }),
        }),
      );
    });
  });

  describe('getSellerRfqDetail', () => {
    it('should return RFQ detail with only seller\'s SKUs', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.rfq.findUnique.mockResolvedValue({
        ...mockRfq,
        quotes: [],
        messageThread: null,
      });

      const result = await service.getSellerRfqDetail('user-seller-456', 'rfq-123');

      expect(result.id).toBe('rfq-123');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].sku.id).toBe('sku-123');
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerRfqDetail('non-seller', 'rfq-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      await expect(service.getSellerRfqDetail('user-seller-456', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if RFQ contains no seller SKUs', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'different-sku' }]); // Different SKU
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq); // RFQ has sku-123

      await expect(service.getSellerRfqDetail('user-seller-456', 'rfq-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should filter line items to only show seller\'s products', async () => {
      const rfqWithMultipleSellerSkus = {
        ...mockRfq,
        lineItems: [
          { ...mockRfq.lineItems[0], skuId: 'sku-123', sku: mockSku },
          { ...mockRfq.lineItems[0], id: 'line-item-2', skuId: 'sku-456', sku: mockOtherSku },
        ],
        quotes: [],
        messageThread: null,
      };

      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]); // Only seller's SKU
      mockPrismaService.rfq.findUnique.mockResolvedValue(rfqWithMultipleSellerSkus);

      const result = await service.getSellerRfqDetail('user-seller-456', 'rfq-123');

      // Should only include seller's line items
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].sku.id).toBe('sku-123');
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('should not allow seller to access buyer RFQ endpoints', async () => {
      // Seller trying to access buyer endpoints
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerRfqs('user-seller-456')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.getBuyerRfqDetail('user-seller-456', 'rfq-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should not allow buyer to access seller RFQ endpoints', async () => {
      // Buyer trying to access seller endpoints
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerRfqs('user-buyer-123')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.getSellerRfqDetail('user-buyer-123', 'rfq-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should isolate RFQs between different buyers', async () => {
      const differentBuyerProfile = {
        ...mockBuyerProfile,
        id: 'different-buyer-profile',
        userId: 'different-buyer-user',
      };

      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(differentBuyerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      // Different buyer trying to access another buyer's RFQ
      await expect(
        service.getBuyerRfqDetail('different-buyer-user', 'rfq-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
